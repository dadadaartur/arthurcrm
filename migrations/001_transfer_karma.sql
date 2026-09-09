-- ============================================================================
-- 001_transfer_karma.sql
--
-- Атомарная функция перевода кармиков между сотрудниками одной компании.
-- Закрывает race condition из аудита: pages/api/transfer.js читал баланс,
-- проверял его в JS и писал новое значение отдельным запросом — при двух
-- параллельных переводах оба запроса могли прочитать один и тот же баланс
-- до того, как любой из них его запишет, и списание срабатывало дважды.
--
-- ⚠️  ПЕРЕД ПРИМЕНЕНИЕМ В ПРОДЕ:
-- Имена и типы колонок ниже собраны по коду приложения и списку индексов
-- из Supabase (CSV-экспорт), а НЕ по прямому дампу схемы — я не подключён
-- к вашей базе напрямую. Проверьте их в Table Editor (особенно типы
-- karma_balance.balance и transfers.amount) и прогоните это на стейджинге
-- или тестовой ветке Supabase перед продакшеном, прежде чем полагаться на
-- это в реальных переводах.
--
-- Применяется через Supabase SQL Editor целиком, одним запуском.
-- ============================================================================

create or replace function public.transfer_karma(
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_amount numeric,
  p_comment text default null
)
returns table (new_sender_balance numeric, new_recipient_balance numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_company_id bigint;
  v_recipient_company_id bigint;
  v_sender_deleted timestamptz;
  v_recipient_deleted timestamptz;
  v_company_status text;
  v_sender_balance numeric;
  v_new_sender_balance numeric;
  v_new_recipient_balance numeric;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Некорректная сумма перевода';
  end if;

  if p_from_user_id = p_to_user_id then
    raise exception 'Нельзя перевести самому себе';
  end if;

  select company_id, deleted_at into v_sender_company_id, v_sender_deleted
  from public.profiles where user_id = p_from_user_id;
  if not found then
    raise exception 'Профиль отправителя не найден';
  end if;
  if v_sender_deleted is not null then
    raise exception 'Профиль отправителя недоступен';
  end if;

  select company_id, deleted_at into v_recipient_company_id, v_recipient_deleted
  from public.profiles where user_id = p_to_user_id;
  if not found then
    raise exception 'Профиль получателя не найден';
  end if;
  if v_recipient_deleted is not null then
    raise exception 'Профиль получателя недоступен';
  end if;

  if v_sender_company_id is null or v_sender_company_id is distinct from v_recipient_company_id then
    raise exception 'Получатель из другой компании';
  end if;

  select status into v_company_status from public.companies where id = v_sender_company_id;
  if v_company_status is distinct from 'active' then
    raise exception 'Компания неактивна';
  end if;

  -- Блокируем строки karma_balance ОБЕИХ сторон в едином порядке (по
  -- user_id) — это защищает не только от гонки в рамках одного перевода,
  -- но и от deadlock, если два перевода идут друг другу навстречу
  -- одновременно (A переводит B, B в этот же момент переводит A).
  perform 1 from public.karma_balance
    where user_id in (p_from_user_id, p_to_user_id)
    order by user_id
    for update;

  select balance into v_sender_balance from public.karma_balance where user_id = p_from_user_id;
  v_sender_balance := coalesce(v_sender_balance, 0);

  if v_sender_balance < p_amount then
    raise exception 'Недостаточно кармиков для перевода';
  end if;

  v_new_sender_balance := v_sender_balance - p_amount;

  insert into public.karma_balance (user_id, balance, updated_at)
  values (p_from_user_id, v_new_sender_balance, now())
  on conflict (user_id) do update
    set balance = v_new_sender_balance, updated_at = now();

  -- Получатель — upsert со сложением: если строки ещё не было (первый
  -- когда-либо перевод этому человеку), она создастся с balance = p_amount;
  -- если была — атомарно прибавит p_amount к текущему значению.
  insert into public.karma_balance (user_id, balance, updated_at)
  values (p_to_user_id, p_amount, now())
  on conflict (user_id) do update
    set balance = public.karma_balance.balance + p_amount, updated_at = now()
  returning balance into v_new_recipient_balance;

  insert into public.transfers (from_user_id, to_user_id, amount, comment)
  values (p_from_user_id, p_to_user_id, p_amount, p_comment);

  new_sender_balance := v_new_sender_balance;
  new_recipient_balance := v_new_recipient_balance;
  return next;
end;
$$;

-- Только service_role должен иметь право вызывать эту функцию. Она
-- SECURITY DEFINER (выполняется с правами владельца, в обход RLS) — если
-- оставить её открытой для authenticated/anon, ЛЮБОЙ пользователь сможет
-- вызвать её напрямую через PostgREST /rest/v1/rpc/transfer_karma со своим
-- обычным JWT, подставив ЧУЖОЙ p_from_user_id, и списать деньги у кого
-- угодно — в обход всей проверки в pages/api/transfer.js (там
-- p_from_user_id берётся из проверенного requireAuth, а не из тела запроса,
-- но сама SQL-функция это не проверяет — доверие обеспечивается именно
-- тем, что вызвать её может только серверный код через service_role).
revoke all on function public.transfer_karma(uuid, uuid, numeric, text) from public;
revoke all on function public.transfer_karma(uuid, uuid, numeric, text) from anon;
revoke all on function public.transfer_karma(uuid, uuid, numeric, text) from authenticated;
grant execute on function public.transfer_karma(uuid, uuid, numeric, text) to service_role;

-- PostgREST кэширует схему — без этого вызов может на какое-то время падать
-- с "Could not find the function in the schema cache" (это уже случалось
-- в истории проекта, см. комментарии в старой версии кода).
notify pgrst, 'reload schema';
