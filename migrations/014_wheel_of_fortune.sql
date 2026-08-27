-- ============================================================================
-- 014_wheel_of_fortune.sql  (НОВЫЙ файл — не давал раньше)
--
-- Колесо фортуны (п.1 из большого списка фидбека, 27 августа 2026):
-- «сотрудник достигает целей, ему даются попытки в колесе... гибкие
-- настройки у админа, можно не использовать».
--
-- Триггер попытки — переход на новый уровень мастерства (progress_levels,
-- уже отлаженная система энергии) — не строю отдельный конструктор
-- условий с нуля, опираюсь на то, что уже работает и настроено по темпу.
-- ============================================================================

create table if not exists public.wheel_configs (
  company_id bigint primary key references public.companies(id) on delete cascade,
  enabled boolean not null default false,
  levels_per_spin integer not null default 1,
  prizes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on column public.wheel_configs.levels_per_spin is
  'Через сколько пройденных уровней мастерства даётся одна попытка (1 = за каждый уровень).';
comment on column public.wheel_configs.prizes is
  'Массив призов: [{"id","label","color","weight","type":"karma"|"custom","amount"|"text"}, ...]. weight — относительный вес при случайном выборе (не обязательно в сумме 100).';

alter table public.profiles
  add column if not exists wheel_spins_available integer not null default 0;

create table if not exists public.wheel_spin_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id bigint references public.companies(id) on delete cascade,
  prize_label text not null,
  prize_type text not null,
  prize_value text,
  created_at timestamptz not null default now()
);
create index if not exists idx_wheel_spin_history_user on public.wheel_spin_history(user_id, created_at desc);

alter table public.wheel_spin_history enable row level security;
drop policy if exists "Users view own spin history" on public.wheel_spin_history;
create policy "Users view own spin history" on public.wheel_spin_history
  for select using (auth.uid() = user_id);

notify pgrst, 'reload schema';
