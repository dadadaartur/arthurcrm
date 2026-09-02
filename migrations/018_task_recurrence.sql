-- Движок регулярности заданий (раунд «работа над заданиями», 1 сентября
-- 2026). РАНЬШЕ: поле tasks.frequency записывалось при создании, но
-- нигде не читалось — ни один cron, ни одна серверная или клиентская
-- проверка не обрабатывали его, а UI создания задания вообще не
-- позволял выбрать ничего, кроме 'once' (жёстко зашито в форме).
-- «Ежедневное» задание физически работало как разовое — выполнили один
-- раз, и оно оставалось выполненным навсегда, никогда не сбрасывалось.

alter table public.tasks
  add column if not exists recurrence_type text not null default 'once',
  add column if not exists reset_hour smallint not null default 8,
  add column if not exists recurrence_weekday smallint,
  add column if not exists recurrence_start_date date,
  add column if not exists recurrence_end_date date,
  add column if not exists deadline_time time,
  add column if not exists target_user_ids uuid[];

comment on column public.tasks.recurrence_type is 'once | hourly | daily | weekly — тип повтора задания';
comment on column public.tasks.reset_hour is 'Час (0-23) начала нового периода для hourly/daily/weekly, по умолчанию 8 (08:00)';
comment on column public.tasks.recurrence_weekday is 'День недели 1=Пн..7=Вс для weekly — справочно, для какого дня недели задумано начало периода (сама генерация периодов идёт понедельно по ISO-неделе, см. lib/recurrence.js)';
comment on column public.tasks.recurrence_start_date is 'Начало окна действия регулярности. NULL = без ограничения, начиная с даты создания';
comment on column public.tasks.recurrence_end_date is 'Конец окна действия регулярности. После этой даты новые периоды не генерируются, задание уходит в архив автоматически';
comment on column public.tasks.deadline_time is 'Точное время дня для дедлайна (используется вместе с deadline_at/датой) — нужно для коротких заданий вроде «выполнить за 2 часа»';
comment on column public.tasks.target_user_ids is 'Персональный список сотрудников для target_role=specific — раньше сохранялся только в виде уже созданных task_assignments, из-за чего для регулярных заданий не было способа заново вычислить аудиторию на следующий период';

-- Перенос уже сохранённых значений старого поля frequency, если там
-- было что-то отличное от дефолта — не хотим потерять то немногое, что
-- уже записано у существующих заданий.
update public.tasks set recurrence_type = frequency
  where frequency in ('once', 'hourly', 'daily', 'weekly') and recurrence_type = 'once' and frequency != 'once';

create index if not exists idx_tasks_recurrence
  on public.tasks(recurrence_type)
  where is_active = true and is_archived = false and recurrence_type != 'once';

-- Каждый период регулярного задания — отдельная строка назначения, а не
-- переиспользование одной и той же. Это даёт честную историю «день 1 —
-- выполнено, день 2 — нет» для будущей аналитики вместо одного текущего
-- статуса, который бы просто перезаписывался.
alter table public.task_assignments
  add column if not exists period_key text;

comment on column public.task_assignments.period_key is 'Ключ периода для регулярных заданий: "2026-09-01T14" для hourly, "2026-09-01" для daily, "2026-W36" для weekly (ISO-неделя). NULL — обычное разовое назначение, как раньше';

create unique index if not exists idx_task_assignments_period
  on public.task_assignments(task_id, user_id, period_key)
  where period_key is not null;
