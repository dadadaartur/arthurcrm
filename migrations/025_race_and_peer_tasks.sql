-- Гонка сотрудников и привилегия шуточных заданий (марафон ИИ-
-- аналитика, часть 2, 6 сентября 2026). Месячный цикл, обнуляется
-- 1 числа. Победители топ-3 получают право создать 1-2 шуточных
-- задания коллегам за цикл — с обязательным подтверждением админа
-- перед публикацией (не полностью свободное peer-to-peer).

create table if not exists public.race_winners (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies(id) on delete cascade,
  cycle_month date not null, -- всегда 1 число месяца, напр. 2026-09-01
  rank smallint not null check (rank between 1 and 3),
  user_id uuid not null references auth.users(id) on delete cascade,
  karma_earned integer not null,
  joke_tasks_used smallint not null default 0,
  awarded_at timestamptz not null default now()
);

comment on table public.race_winners is 'Топ-3 месячной гонки по кармикам, заработанным за календарный месяц (не общий баланс) — иначе тот, кто накопил давно, всегда побеждал бы независимо от усилий в текущем цикле';
comment on column public.race_winners.joke_tasks_used is 'Сколько из положенных 1-2 шуточных заданий за цикл уже создано — растёт при каждой заявке в peer_tasks, независимо от её дальнейшего одобрения/отклонения админом';

create unique index if not exists idx_race_winners_unique on public.race_winners(company_id, cycle_month, rank);
create index if not exists idx_race_winners_user on public.race_winners(user_id, cycle_month);

create table if not exists public.peer_tasks (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null,
  description text,
  reward_karma integer not null default 5,
  target_user_ids uuid[] not null,
  status text not null default 'pending', -- pending | approved | rejected
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  resulting_task_id bigint references public.tasks(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.peer_tasks is 'Шуточные задания от сотрудника коллегам — привилегия топ-3 месячной гонки. Требует подтверждения админа компании перед публикацией (см. status), на публикации создаёт обычную запись в tasks';
comment on column public.peer_tasks.reward_karma is 'Ограничено небольшими числами на уровне интерфейса (это шутка/развлечение, не замена обычных заданий с серьёзной наградой) — не ограничено на уровне базы, чтобы не быть излишне жёстким';

create index if not exists idx_peer_tasks_company_status on public.peer_tasks(company_id, status);

alter table public.race_winners enable row level security;
alter table public.peer_tasks enable row level security;

drop policy if exists "Company members view own company race winners" on public.race_winners;
create policy "Company members view own company race winners" on public.race_winners
  for select using (company_id in (select company_id from public.profiles where user_id = auth.uid()));

drop policy if exists "Company members view own company peer tasks" on public.peer_tasks;
create policy "Company members view own company peer tasks" on public.peer_tasks
  for select using (company_id in (select company_id from public.profiles where user_id = auth.uid()));
