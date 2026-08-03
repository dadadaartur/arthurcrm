-- ============================================================================
-- ArthurCRM — миграция безопасности + поддержка кабинета модератора площадки
-- Дата: 2026-08-02
--
-- ВАЖНО ПЕРЕД ПРИМЕНЕНИЕМ:
--  1. Сделайте бэкап БД (Supabase Dashboard → Database → Backups, или pg_dump).
--  2. Прогоните сначала на staging/тестовом проекте.
--  3. Секция 0 — диагностика. Прогоните её ОТДЕЛЬНО и посмотрите на результат
--     до применения остального файла, чтобы понять реальное состояние RLS.
-- ============================================================================


-- ============================================================================
-- 0. ДИАГНОСТИКА (выполнить и посмотреть на результат до остальных секций)
-- ============================================================================
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  count(p.policyname) as policy_count
from pg_class c
left join pg_policies p
  on p.schemaname = 'public' and p.tablename = c.relname
where c.relnamespace = 'public'::regnamespace
  and c.relkind = 'r'
group by c.relname, c.relrowsecurity, c.relforcerowsecurity
order by rls_enabled asc, policy_count asc;
-- Любая строка с rls_enabled = false — таблица ПОЛНОСТЬЮ открыта через anon-ключ.
-- Любая строка с rls_enabled = true и policy_count = 0 — таблица закрыта наглухо
-- (что тоже плохо, если приложению нужен к ней доступ — значит, там баг в коде,
-- который вы, возможно, сейчас ловите как "не работает регистрация").


-- ============================================================================
-- 1. ВКЛЮЧАЕМ RLS ВЕЗДЕ, ГДЕ ОН МОГ БЫТЬ ВЫКЛЮЧЕН
-- ============================================================================
alter table if exists public.companies      enable row level security;
alter table if exists public.invitations    enable row level security;
alter table if exists public.positions      enable row level security;
alter table if exists public.departments    enable row level security;
alter table if exists public.admin_users    enable row level security;
alter table if exists public.audit_logs     enable row level security;
alter table if exists public.task_history   enable row level security;
alter table if exists public.purchase_ratings enable row level security;


-- ============================================================================
-- 2. ХЕЛПЕР-ФУНКЦИИ ДЛЯ ПЛАТФОРМЕННЫХ РОЛЕЙ
--    (используются и в RLS, и в API через service-role, но полезны и в SQL)
-- ============================================================================

-- Платформенный супер-админ Кармического банка (то же самое, что уже было:
-- role_id = 1, company_id is null — просто выносим в функцию, чтобы не
-- дублировать логику по всем policy).
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role_id = 1
      and company_id is null
  );
$$;

-- Любой сотрудник площадки (супер-админ ИЛИ модератор из admin_users).
create or replace function public.is_platform_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
      select 1 from public.admin_users
      where user_id = auth.uid()
        and active = true
    );
$$;

-- Есть ли конкретное платформенное право у модератора (супер-админ — всегда true)
create or replace function public.has_platform_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
      select 1 from public.admin_users
      where user_id = auth.uid()
        and active = true
        and (perm = any(permissions))
    );
$$;


-- ============================================================================
-- 3. admin_users — таблица платформенных модераторов
--    (в схеме таблица уже существует, но нигде не используется в коде —
--    досоздаём недостающие колонки защищённо, ничего не ломая, если там
--    уже что-то есть)
-- ============================================================================
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid()
);

alter table public.admin_users add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.admin_users add column if not exists display_name text;
alter table public.admin_users add column if not exists permissions text[] not null default '{}'::text[];
-- Возможные значения permissions: 'approve_companies', 'suspend_companies',
-- 'moderate_content', 'view_finance', 'manage_moderators' (последнее — только
-- для супер-админа, но пусть будет в списке для единообразия UI).
alter table public.admin_users add column if not exists active boolean not null default true;
alter table public.admin_users add column if not exists created_at timestamptz not null default now();
alter table public.admin_users add column if not exists created_by uuid references auth.users(id);

create unique index if not exists admin_users_user_id_key on public.admin_users(user_id);

drop policy if exists "Platform staff can view admin_users" on public.admin_users;
create policy "Platform staff can view admin_users"
  on public.admin_users for select
  using (public.is_platform_staff());

drop policy if exists "Only super admin manages admin_users" on public.admin_users;
create policy "Only super admin manages admin_users"
  on public.admin_users for all
  using (public.is_super_admin())
  with check (public.is_super_admin());


-- ============================================================================
-- 4. companies — статус компании (для модерации) + RLS
-- ============================================================================
alter table public.companies add column if not exists status text not null default 'active';
alter table public.companies add column if not exists status_reason text;
alter table public.companies add column if not exists status_changed_by uuid references auth.users(id);
alter table public.companies add column if not exists status_changed_at timestamptz;
alter table public.companies add column if not exists created_at timestamptz not null default now();

do $$ begin
  alter table public.companies add constraint companies_status_check
    check (status in ('pending', 'active', 'suspended', 'rejected'));
exception when duplicate_object then null;
end $$;

drop policy if exists "Members can view own company" on public.companies;
create policy "Members can view own company"
  on public.companies for select
  using (
    id in (select company_id from public.profiles where user_id = auth.uid())
    or public.is_platform_staff()
  );

drop policy if exists "Company admins can update own company" on public.companies;
create policy "Company admins can update own company"
  on public.companies for update
  using (
    id in (
      select company_id from public.profiles
      where user_id = auth.uid() and is_company_admin = true
    )
  )
  with check (
    -- Обычный админ компании НЕ может сам себе поменять статус модерации —
    -- эту колонку трогает только сервисный ключ (платформенные API).
    status = (select status from public.companies c2 where c2.id = companies.id)
  );

-- INSERT в companies с клиента запрещён намеренно: создание компании идёт
-- только через /api/create-company.js под service_role (там своя бизнес-логика
-- и защита от гонок/дублей). Отдельной policy для INSERT нет — значит,
-- обычным клиентским ключом вставить строку нельзя.

drop policy if exists "Platform staff manage companies" on public.companies;
create policy "Platform staff manage companies"
  on public.companies for all
  using (public.is_platform_staff())
  with check (public.is_platform_staff());


-- ============================================================================
-- 5. invitations — переработка: без открытого чтения с клиента вообще.
--    Всё взаимодействие с этой таблицей теперь идёт только через серверные
--    API (service_role): pages/api/company-admin/invite-employee.js и
--    pages/api/invitations/accept.js. Прямой доступ с anon/authenticated
--    ключом закрыт полностью.
-- ============================================================================
alter table public.invitations add column if not exists company_id bigint;
alter table public.invitations add column if not exists role_id bigint;
alter table public.invitations add column if not exists email text;
alter table public.invitations add column if not exists status text not null default 'pending';
alter table public.invitations add column if not exists invited_user_id uuid references auth.users(id);
alter table public.invitations add column if not exists permissions jsonb not null default '{}'::jsonb;
alter table public.invitations add column if not exists created_by uuid references auth.users(id);
alter table public.invitations add column if not exists created_at timestamptz not null default now();
alter table public.invitations add column if not exists accepted_at timestamptz;

-- Старый механизм temp_password/token в открытом виде — убираем из
-- активного использования. Колонку не дропаем сразу (на случай, если есть
-- незакрытые старые приглашения), но она больше не используется приложением
-- и не должна попадать ни в один SELECT с клиента.
comment on column public.invitations.temp_password is
  'DEPRECATED: больше не используется. Не читать и не писать из клиентского кода. Оставлено для миграции старых pending-приглашений, затем можно дропнуть колонку.';

-- Никаких SELECT/INSERT/UPDATE policy для authenticated/anon НЕ создаём —
-- таблица доступна только service_role (обходит RLS) и is_platform_staff()
-- на чтение, для аудита/поддержки.
drop policy if exists "Platform staff can view invitations" on public.invitations;
create policy "Platform staff can view invitations"
  on public.invitations for select
  using (public.is_platform_staff());


-- ============================================================================
-- 6. positions / departments — RLS по компании
-- ============================================================================
drop policy if exists "Company members view positions" on public.positions;
create policy "Company members view positions"
  on public.positions for select
  using (
    company_id in (select company_id from public.profiles where user_id = auth.uid())
    or public.is_platform_staff()
  );

drop policy if exists "Company admins manage positions" on public.positions;
create policy "Company admins manage positions"
  on public.positions for all
  using (
    company_id in (
      select company_id from public.profiles
      where user_id = auth.uid()
        and (is_company_admin = true or can_manage_employees = true)
    )
  )
  with check (
    company_id in (
      select company_id from public.profiles
      where user_id = auth.uid()
        and (is_company_admin = true or can_manage_employees = true)
    )
  );

drop policy if exists "Company members view departments" on public.departments;
create policy "Company members view departments"
  on public.departments for select
  using (
    company_id in (select company_id from public.profiles where user_id = auth.uid())
    or public.is_platform_staff()
  );

drop policy if exists "Company admins manage departments" on public.departments;
create policy "Company admins manage departments"
  on public.departments for all
  using (
    company_id in (
      select company_id from public.profiles
      where user_id = auth.uid() and is_company_admin = true
    )
  )
  with check (
    company_id in (
      select company_id from public.profiles
      where user_id = auth.uid() and is_company_admin = true
    )
  );


-- ============================================================================
-- 7. audit_logs / task_history / purchase_ratings — только чтение своей
--    компанией + платформенным стаффом, запись — только через service_role.
-- ============================================================================
drop policy if exists "Company admins view audit logs" on public.audit_logs;
create policy "Company admins view audit logs"
  on public.audit_logs for select
  using (
    public.is_platform_staff()
    or user_id in (
      select p2.user_id from public.profiles p2
      where p2.company_id = (
        select company_id from public.profiles where user_id = auth.uid()
      )
    )
    and exists (
      select 1 from public.profiles me
      where me.user_id = auth.uid() and me.is_company_admin = true
    )
  );

drop policy if exists "Users view own task history" on public.task_history;
create policy "Users view own task history"
  on public.task_history for select
  using (
    public.is_platform_staff()
    or user_id = auth.uid()
    or exists (
      select 1 from public.profiles me
      where me.user_id = auth.uid()
        and (me.is_company_admin = true or me.can_review_tasks = true)
        and me.company_id = (select company_id from public.profiles p2 where p2.user_id = task_history.user_id)
    )
  );

drop policy if exists "Users view own purchase ratings" on public.purchase_ratings;
create policy "Users view own purchase ratings"
  on public.purchase_ratings for select
  using (
    public.is_platform_staff()
    or user_id = auth.uid()
  );


-- ============================================================================
-- 8. ИСПРАВЛЕНИЕ: karma_events — убираем межарендную утечку pending-событий
-- ============================================================================
drop policy if exists "Users can view own events" on public.karma_events;
create policy "Users can view own events"
  on public.karma_events for select
  using (
    auth.uid() = user_id
    or public.is_platform_staff()
    or (
      status = 'pending'
      and exists (
        select 1 from public.profiles me
        join public.profiles target on target.user_id = karma_events.user_id
        where me.user_id = auth.uid()
          and me.company_id = target.company_id
          and (me.is_company_admin = true or me.role_id = 1
               or me.can_review_tasks = true)
      )
    )
  );


-- ============================================================================
-- 9. ИСПРАВЛЕНИЕ: chat_sessions / chat_messages — межарендная утечка переписки
--    Убираем чрезмерно широкие policy, оставляем только компанийные +
--    участников сессии. Публичный анонимный виджет (если нужен) должен
--    ходить только через отдельный серверный API с собственной проверкой
--    session-секрета, а не напрямую в таблицу с anon-ключом.
-- ============================================================================
drop policy if exists "Allow reading messages of session" on public.chat_messages;
drop policy if exists "Anon can view chat_messages" on public.chat_messages;
drop policy if exists "Allow anonymous insert to chat_messages" on public.chat_messages;
drop policy if exists "Anon can insert chat_messages" on public.chat_messages;
-- Оставляем только:
--   "Company members can view chat_messages" (уже есть, компанийная)
--   "Users can view messages of their sessions" (уже есть, по operator/client)
--   "Users can insert messages" (уже есть, по operator/client)
-- Если публичному неавторизованному виджету нужна отправка сообщений —
-- заведите отдельный API-роут с service_role и своей проверкой
-- (например, подписанный session-token в httpOnly cookie), а не открытую
-- RLS-policy "with_check: true".

drop policy if exists "Allow anonymous insert to chat_sessions" on public.chat_sessions;
drop policy if exists "Anon can insert chat_sessions" on public.chat_sessions;
drop policy if exists "Anon can view chat_sessions" on public.chat_sessions;
-- Аналогично: оставляем компанийные/участник-based policy, публичный вход
-- для неавторизованных гостей — через серверный API, не напрямую в таблицу.


-- ============================================================================
-- 10. roles — не отдаём чужую оргструктуру всем подряд
-- ============================================================================
drop policy if exists "Auth users can view roles" on public.roles;
create policy "Company members view own company roles"
  on public.roles for select
  using (
    company_id is null  -- системные роли (супер-админ) — видно всем авторизованным
    or company_id in (select company_id from public.profiles where user_id = auth.uid())
    or public.is_platform_staff()
  );


-- ============================================================================
-- 11. sso_handoff_codes — одноразовые коды для передачи сессии во внешнюю
--     CRM без токенов в URL (см. pages/api/crm-handoff/*.js)
-- ============================================================================
create table if not exists public.sso_handoff_codes (
  id bigint generated always as identity primary key,
  code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.sso_handoff_codes enable row level security;
-- Никаких policy для authenticated/anon — доступ только через service_role
-- из pages/api/crm-handoff/*.js. Это осознанно: коды содержат живые токены
-- сессии, таблица должна быть недостижима напрямую с клиента.

-- Периодическая очистка старых кодов (не обязательно, но гигиенично).
-- Раскомментируйте, если в проекте включён pg_cron (расширение cron уже
-- есть в схемах вашего проекта):
-- select cron.schedule(
--   'cleanup-sso-handoff-codes',
--   '*/15 * * * *',
--   $$ delete from public.sso_handoff_codes where expires_at < now() - interval '1 hour' $$
-- );


-- ============================================================================
-- 12. Принудительное ограничение на уровне БД для заблокированных компаний
--     (а не только на уровне интерфейса — components/Layout.js показывает
--     экран блокировки, но без этого раздела пользователь мог бы всё равно
--     писать данные напрямую через Supabase REST API тем же ключом).
--
--     Используем RESTRICTIVE policy — она AND-ится поверх обычных
--     (permissive) policy на INSERT, не заменяя и не ломая их: остальные
--     условия (кто именно может создавать задачу/сделку и т.д.) продолжают
--     работать как раньше, здесь только дополнительное "и company активна".
--     SELECT/UPDATE существующих данных не трогаем — история не пропадает,
--     компания просто не может создавать НОВОЕ, пока не снят статус.
-- ============================================================================
create or replace function public.my_company_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select status = 'active' from public.companies
      where id = (select company_id from public.profiles where user_id = auth.uid())),
    true  -- нет company_id (например, супер-админ без компании) — не блокируем
  ) or public.is_platform_staff();
$$;

drop policy if exists "Block writes for non-active companies (tasks)" on public.tasks;
create policy "Block writes for non-active companies (tasks)"
  on public.tasks as restrictive for insert
  with check (public.my_company_is_active());

drop policy if exists "Block writes for non-active companies (deals)" on public.deals;
create policy "Block writes for non-active companies (deals)"
  on public.deals as restrictive for insert
  with check (public.my_company_is_active());

drop policy if exists "Block writes for non-active companies (purchases)" on public.purchases;
create policy "Block writes for non-active companies (purchases)"
  on public.purchases as restrictive for insert
  with check (public.my_company_is_active());

drop policy if exists "Block writes for non-active companies (transfers)" on public.transfers;
create policy "Block writes for non-active companies (transfers)"
  on public.transfers as restrictive for insert
  with check (public.my_company_is_active());


-- ============================================================================
-- ГОТОВО. После применения:
--  1. Ещё раз прогоните диагностический запрос из секции 0 — у всех таблиц
--     должно быть rls_enabled = true и policy_count > 0 (либо 0, если это
--     таблица, доступная только сервису — это ожидаемо для invitations).
--  2. Назначьте себя первым платформенным модератором/супер-админом:
--       insert into public.admin_users (user_id, display_name, permissions)
--       values ('<ваш auth.users.id>', 'Имя', array['approve_companies','suspend_companies','moderate_content']);
--     (или используйте существующий profiles.role_id = 1 для полного супер-админа)
-- ============================================================================
