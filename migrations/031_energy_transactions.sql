-- Журнал начислений энергии (по анализу от 6 сентября 2026 —
-- «рейтинги должны выстраиваться по энергии, а не кармикам, кармики
-- можно перевести, это делает соревнование неактуальным»). До этой
-- миграции energy в kpi_energy было единственным накопленным числом
-- без истории — посчитать «сколько заработано именно в этом месяце»
-- для гонки или «именно за это окно раунда» для кубка было физически
-- невозможно. Журнал — по той же схеме, что уже работает у
-- karma_transactions.

create table if not exists public.energy_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  source text, -- metric | task | test — откуда пришло, для будущей аналитики эффективности источников
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_energy_transactions_user on public.energy_transactions(user_id, created_at desc);

comment on table public.energy_transactions is 'Журнал начислений энергии — суммируется за период для гонки/лиги/кубка, kpi_energy.energy остаётся текущим накопленным итогом для уровней мастерства, не заменяется этой таблицей, а дополняется ею';

alter table public.energy_transactions enable row level security;
drop policy if exists "Users view own energy transactions" on public.energy_transactions;
create policy "Users view own energy transactions" on public.energy_transactions for select using (user_id = auth.uid());
