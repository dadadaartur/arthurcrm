-- Модерация личных целей руководителем (по прямому запросу от
-- 6 сентября 2026: «сотрудник предлагает личные цели, а руководитель
-- модерирует и утверждает либо предлагает скорректировать, если видит,
-- что цель не очень амбициозна или нереалистична») — раньше личная
-- цель сохранялась сразу, без какого-либо участия руководителя в
-- процессе, хотя направлять и корректировать — это прямо названная
-- роль руководителя в системе.

alter table public.personal_goals add column if not exists approval_status text not null default 'pending';
alter table public.personal_goals add column if not exists manager_comment text;

comment on column public.personal_goals.approval_status is 'pending при создании — руководитель ещё не смотрел. approved — одобрена как есть. needs_adjustment — руководитель просит скорректировать, причина в manager_comment';

create index if not exists idx_personal_goals_approval on public.personal_goals(company_id, approval_status) where approval_status = 'pending';
