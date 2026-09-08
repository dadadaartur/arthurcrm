-- Единый учёт выигранных призов (по проверке от 2 сентября 2026) —
-- раньше приз от партнёрского задания попадал только в текст
-- одноразового уведомления сотруднику, без единой структурированной
-- записи. Ни компания, ни суперадмин не могли посмотреть «кому и что
-- нужно физически выдать» — при выигрыше телефона или промокода это
-- значит, что приз может быть буквально потерян административно, даже
-- если он честно выигран.

create table if not exists public.prize_awards (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null, -- 'wheel' (лента подарков) | 'partner_task' (партнёрское задание)
  source_task_id bigint references public.tasks(id) on delete set null,
  label text not null,
  description text,
  awarded_at timestamptz not null default now(),
  fulfilled boolean not null default false,
  fulfilled_at timestamptz,
  fulfilled_by uuid references auth.users(id),
  fulfillment_note text
);

comment on table public.prize_awards is 'Единый структурированный учёт выигранных призов (лента подарков + бонус-призы партнёрских заданий) — чтобы админ компании и суперадмин могли видеть, кому и что нужно выдать, и отмечать выдачу';
comment on column public.prize_awards.source is 'wheel — из ленты подарков компании, partner_task — из бонус-приза партнёрского задания (суперадмин)';
comment on column public.prize_awards.fulfilled is 'Отметил ли админ, что физическая/цифровая выдача приза состоялась — только кармики/буст/разблокировка магазина авто-фулфилятся системой, «настоящий» приз (телефон, промокод) — нет';

create index if not exists idx_prize_awards_company on public.prize_awards(company_id, fulfilled);
create index if not exists idx_prize_awards_user on public.prize_awards(user_id);

alter table public.prize_awards enable row level security;

drop policy if exists "Company admins view own company prizes" on public.prize_awards;
create policy "Company admins view own company prizes" on public.prize_awards
  for select using (
    company_id in (select company_id from public.profiles where user_id = auth.uid() and is_company_admin = true)
  );
