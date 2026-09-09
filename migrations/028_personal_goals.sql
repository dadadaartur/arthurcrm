-- Личные цели сотрудника (по запросу от 6 сентября 2026) — в отличие
-- от показателей kpi_metrics (задаёт админ, данные вносятся тоже
-- админом), это цели, которые сотрудник ставит СЕБЕ САМ и сам же
-- отслеживает прогресс. Промежуточные могут быть привязаны к
-- глобальной (parent_goal_id) как шаг на пути к ней, а могут быть
-- самостоятельными. Руководитель видит всё по своей команде, но не
-- редактирует чужие личные цели — только смотрит отчёт.

create table if not exists public.personal_goals (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id bigint not null references public.companies(id) on delete cascade,
  goal_type text not null default 'intermediate', -- global | intermediate
  parent_goal_id bigint references public.personal_goals(id) on delete set null,
  title text not null,
  description text,
  target_value numeric, -- необязательно — не любая цель измерима числом
  target_unit text,
  current_value numeric not null default 0,
  target_date date,
  status text not null default 'active', -- active | completed | abandoned
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

comment on table public.personal_goals is 'Личные цели сотрудника — ставит и отслеживает сам, не админ. parent_goal_id связывает промежуточную цель с глобальной, к которой она ведёт';

create index if not exists idx_personal_goals_user on public.personal_goals(user_id, status);
create index if not exists idx_personal_goals_company on public.personal_goals(company_id, status);

alter table public.personal_goals enable row level security;

drop policy if exists "Users manage own personal goals" on public.personal_goals;
create policy "Users manage own personal goals" on public.personal_goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Company admins view team personal goals" on public.personal_goals;
create policy "Company admins view team personal goals" on public.personal_goals
  for select using (
    company_id in (select company_id from public.profiles where user_id = auth.uid() and is_company_admin = true)
  );
