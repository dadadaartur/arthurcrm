-- План развития сотрудника (по итогам обсуждения от 6 сентября
-- 2026) — единый учёт действий, которые руководитель назначает по
-- находке ИИ-аналитика: не только задание, а тренинг, тест/срез
-- знаний или мотивирующее задание. Каждое действие — с отслеживаемым
-- дедлайном и статусом, чтобы ничего не терялось и было видно на
-- одной странице у сотрудника, что ему назначено и когда срок.

create table if not exists public.development_actions (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null, -- 'task' | 'training' | 'test'
  title text not null,
  reason text, -- почему назначено — находка ИИ-аналитика, если есть (для контекста, не теряется со временем)
  reference_id bigint, -- id задания / тренинга / теста, смотря по action_type
  deadline date,
  status text not null default 'pending', -- pending | completed | overdue | cancelled
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

comment on table public.development_actions is 'Единый план развития сотрудника — все действия, назначенные руководителем (напрямую или по находке ИИ-аналитика), с отслеживаемым дедлайном. Заменяет разрозненное «просто создали задание» на цельную историю по каждому человеку';

create index if not exists idx_development_actions_user on public.development_actions(user_id, status);
create index if not exists idx_development_actions_company on public.development_actions(company_id, status, deadline);

alter table public.development_actions enable row level security;

drop policy if exists "Company members view own company development actions" on public.development_actions;
create policy "Company members view own company development actions" on public.development_actions
  for select using (company_id in (select company_id from public.profiles where user_id = auth.uid()));
