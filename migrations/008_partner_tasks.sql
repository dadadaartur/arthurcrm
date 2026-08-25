-- ============================================================================
-- 008_partner_tasks.sql
--
-- П.11 ТЗ от 24 августа 2026 — задания от партнёров (создаёт супер-админ
-- площадки, arturgalkin.ru@mail.ru, или модератор с правом
-- manage_partner_tasks — модель гибких прав admin_users.permissions уже
-- существовала и используется как есть, новых столбцов под это не нужно).
--
-- Оба новых механизма награды — разблокировка категории магазина и % буст
-- к начислениям — не заводят отдельных таблиц-дублей под задания: задание
-- остаётся обычной строкой в tasks (со всей уже рабочей инфраструктурой
-- назначения/сдачи/проверки), просто с новым reward_type и reward_config.
-- ============================================================================

alter table public.tasks
  add column if not exists partner_name text;

alter table public.tasks
  add column if not exists reward_type text not null default 'karma';

alter table public.tasks
  add column if not exists reward_config jsonb;

comment on column public.tasks.reward_type is
  'karma (обычное начисление кармиков, было единственным вариантом) | '
  'shop_unlock (открывает категорию магазина, см. employee_unlocks) | '
  'karma_boost (даёт временный процентный буст ко всем будущим начислениям, '
  'см. karma_boosts). reward_config хранит детали: '
  'shop_unlock -> {"unlock_key": "..."}, karma_boost -> {"percent": 10, "duration_days": 30}.';

-- Активные бусты кармы сотрудника. Несколько записей у одного user_id —
-- нормально (например, буст от банка и буст от другого партнёра сразу) —
-- при начислении суммируются проценты, см. lib/karma.js::creditKarma.
create table if not exists public.karma_boosts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  percent numeric not null default 0,
  source text,
  source_task_id uuid references public.tasks(id) on delete set null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_karma_boosts_user_active on public.karma_boosts(user_id, expires_at);

alter table public.karma_boosts enable row level security;
drop policy if exists "Users view own karma boosts" on public.karma_boosts;
create policy "Users view own karma boosts" on public.karma_boosts
  for select using (auth.uid() = user_id);

-- Что сотрудник разблокировал (категории/товары магазина от партнёров).
create table if not exists public.employee_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unlock_key text not null,
  source_task_id uuid references public.tasks(id) on delete set null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, unlock_key)
);
alter table public.employee_unlocks enable row level security;
drop policy if exists "Users view own unlocks" on public.employee_unlocks;
create policy "Users view own unlocks" on public.employee_unlocks
  for select using (auth.uid() = user_id);

-- Товар/категория магазина может требовать разблокировки (партнёрский
-- мерч/подписки и т.п.). NULL — доступно всем как раньше, обратная
-- совместимость без единой правки существующих строк.
alter table public.rewards
  add column if not exists requires_unlock text;

comment on column public.rewards.requires_unlock is
  'Ключ разблокировки (employee_unlocks.unlock_key), необходимый для '
  'покупки. NULL = доступно всем, как и было для всех существующих '
  'товаров до этой миграции.';

notify pgrst, 'reload schema';
