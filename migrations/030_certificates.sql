-- Грамоты (по запросу от 6 сентября 2026, часть видения «настоящей
-- мотивационной платформы мирового уровня») — цифровой аналог доски
-- почёта в виде документа, который можно посмотреть и скачать себе.
-- Выдаются автоматически по факту события (победа в гонке/лиге/кубке,
-- достижение личной цели), не вручную админом — иначе это станет ещё
-- одной задачей для руководителя, а не честным признанием факта.

create table if not exists public.certificates (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id bigint not null references public.companies(id) on delete cascade,
  achievement_type text not null, -- race_winner | league_champion | cup_winner | personal_goal
  title text not null, -- «Победитель месячной гонки», «Чемпион кубка» и т.д.
  subtitle text, -- «Сентябрь 2026», «Кубок менеджеров — осень 2026» и т.д.
  source_id bigint, -- id связанной записи, для истории, не для логики
  awarded_at timestamptz not null default now()
);

comment on table public.certificates is 'Цифровые грамоты — выдаются автоматически по факту события, не вручную. Самодостаточны (title+subtitle) даже если исходная запись позже удалится';

create index if not exists idx_certificates_user on public.certificates(user_id, awarded_at desc);

alter table public.certificates enable row level security;
drop policy if exists "Users view own certificates" on public.certificates;
create policy "Users view own certificates" on public.certificates for select using (user_id = auth.uid());
drop policy if exists "Company admins view team certificates" on public.certificates;
create policy "Company admins view team certificates" on public.certificates for select using (
  company_id in (select company_id from public.profiles where user_id = auth.uid() and is_company_admin = true)
);
