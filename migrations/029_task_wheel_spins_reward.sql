-- Попытки ленты призов как награда за задание (пункт 1 фидбека от
-- 6 сентября 2026) — раньше попытки давались только за уровни
-- мастерства, теперь любое задание может начислять их тоже, отдельно
-- от кармиков или вместе с ними.

alter table public.tasks add column if not exists reward_wheel_spins integer not null default 0;
comment on column public.tasks.reward_wheel_spins is 'Сколько попыток ленты призов начисляется при одобрении этого задания — независимо от reward_karma, можно и то и другое сразу';
