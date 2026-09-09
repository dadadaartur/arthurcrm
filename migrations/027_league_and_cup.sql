-- Лига и кубок (пункт 2 фидбека от 6 сентября 2026) — вторая часть
-- «Чемпионата менеджеров» после гонки месяца. Лига — годовая регулярная
-- таблица с промежуточными призами по контрольным точкам (по умолчанию
-- квартально), кубок — турнирная сетка на вылет с настраиваемой
-- длительностью раунда.

-- ЛИГА ---------------------------------------------------------------

create table if not exists public.league_seasons (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies(id) on delete cascade,
  year int not null,
  status text not null default 'active', -- active | completed
  checkpoint_months int[] not null default '{3,6,9,12}', -- какие месяцы — контрольные точки для промежуточных призов
  created_at timestamptz not null default now()
);
create unique index if not exists idx_league_seasons_company_year on public.league_seasons(company_id, year);

create table if not exists public.league_checkpoint_awards (
  id bigint generated always as identity primary key,
  season_id bigint not null references public.league_seasons(id) on delete cascade,
  checkpoint_month int not null,
  rank smallint not null check (rank between 1 and 3),
  user_id uuid not null references auth.users(id) on delete cascade,
  karma_at_checkpoint integer not null,
  awarded_at timestamptz not null default now()
);
create unique index if not exists idx_league_checkpoint_unique on public.league_checkpoint_awards(season_id, checkpoint_month, rank);

-- КУБОК ---------------------------------------------------------------

create table if not exists public.cup_tournaments (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies(id) on delete cascade,
  title text not null default 'Кубок месяца',
  status text not null default 'seeding', -- seeding | active | completed | cancelled
  round_duration_days int not null default 7,
  bracket_size int not null, -- 4, 8, 16, 32 — степень двойки
  current_round int not null default 0, -- 0 = ещё не начался
  round_started_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.cup_participants (
  id bigint generated always as identity primary key,
  tournament_id bigint not null references public.cup_tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seed int not null
);
create unique index if not exists idx_cup_participants_unique on public.cup_participants(tournament_id, user_id);

create table if not exists public.cup_matches (
  id bigint generated always as identity primary key,
  tournament_id bigint not null references public.cup_tournaments(id) on delete cascade,
  round int not null, -- 1 = первый раунд, и т.д.
  match_index int not null, -- позиция матча внутри раунда
  participant_a uuid references auth.users(id),
  participant_b uuid references auth.users(id), -- null = автоматический проход (нечётное число участников)
  score_a numeric,
  score_b numeric,
  winner_id uuid references auth.users(id),
  status text not null default 'pending' -- pending | active | completed
);
create index if not exists idx_cup_matches_tournament on public.cup_matches(tournament_id, round);

comment on table public.cup_tournaments is 'Кубок на вылет — bracket_size задаёт размер сетки (степень двойки), current_round отслеживает активный раунд, cron сам подводит итоги раунда и создаёт следующий, когда round_duration_days истекает';
comment on column public.cup_matches.participant_b is 'null означает технический проход участника A в следующий раунд без матча — нужно при небинарном числе участников';

alter table public.league_seasons enable row level security;
alter table public.league_checkpoint_awards enable row level security;
alter table public.cup_tournaments enable row level security;
alter table public.cup_participants enable row level security;
alter table public.cup_matches enable row level security;

drop policy if exists "Company members view own league" on public.league_seasons;
create policy "Company members view own league" on public.league_seasons for select using (company_id in (select company_id from public.profiles where user_id = auth.uid()));
drop policy if exists "Company members view own league awards" on public.league_checkpoint_awards;
create policy "Company members view own league awards" on public.league_checkpoint_awards for select using (season_id in (select id from public.league_seasons where company_id in (select company_id from public.profiles where user_id = auth.uid())));
drop policy if exists "Company members view own cup" on public.cup_tournaments;
create policy "Company members view own cup" on public.cup_tournaments for select using (company_id in (select company_id from public.profiles where user_id = auth.uid()));
drop policy if exists "Company members view own cup participants" on public.cup_participants;
create policy "Company members view own cup participants" on public.cup_participants for select using (tournament_id in (select id from public.cup_tournaments where company_id in (select company_id from public.profiles where user_id = auth.uid())));
drop policy if exists "Company members view own cup matches" on public.cup_matches;
create policy "Company members view own cup matches" on public.cup_matches for select using (tournament_id in (select id from public.cup_tournaments where company_id in (select company_id from public.profiles where user_id = auth.uid())));
