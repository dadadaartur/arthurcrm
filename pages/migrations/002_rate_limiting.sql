-- ============================================================================
-- 002_rate_limiting.sql
--
-- Простая таблица для rate limiting самых чувствительных эндпоинтов
-- (перевод кармиков, создание платежа) — см. lib/rateLimit.js. В проекте
-- нет внешнего Redis/Upstash, а serverless-функции Vercel не хранят
-- состояние между вызовами, поэтому лимитер держит счётчики прямо в
-- Postgres. Для нагрузки этого приложения (внутренний корпоративный
-- инструмент, не публичный высоконагруженный сервис) это нормальный,
-- достаточно быстрый вариант.
-- ============================================================================

create table if not exists public.rate_limit_hits (
  id bigserial primary key,
  bucket_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_bucket_created_idx
  on public.rate_limit_hits (bucket_key, created_at desc);

-- Записи старше суток больше никому не нужны — можно звать эту функцию
-- время от времени (например, добавить вызов в pages/api/cron/check-deadlines.js
-- раз в день), либо просто прогонять вручную по мере роста таблицы.
create or replace function public.cleanup_rate_limit_hits() returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limit_hits where created_at < now() - interval '1 day';
$$;

revoke all on function public.cleanup_rate_limit_hits() from public;
revoke all on function public.cleanup_rate_limit_hits() from anon;
revoke all on function public.cleanup_rate_limit_hits() from authenticated;
grant execute on function public.cleanup_rate_limit_hits() to service_role;

alter table public.rate_limit_hits enable row level security;
-- Осознанно без RLS-политик: доступ к этой таблице только через
-- service_role (он обходит RLS), обычным клиентам сюда доступ не нужен.

notify pgrst, 'reload schema';
