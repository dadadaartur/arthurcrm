-- Визуальные уровни заданий + количественный прогресс (раунд «работа
-- над заданиями», пункт 9, 1 сентября 2026). Раньше у задания не было
-- способа сказать «это приоритетное» или «нужно 30 звонков, не просто
-- одно действие» — только название/описание/дедлайн без какой-либо
-- количественной цели внутри самого задания.

alter table public.tasks
  add column if not exists visual_tier text not null default 'normal',
  add column if not exists target_count integer,
  add column if not exists target_count_label text;

comment on column public.tasks.visual_tier is 'normal | priority | premium — визуальное выделение на странице сотрудника (см. pages/tasks.js). priority — мягкое мерцание рамки, premium — золотой бейдж и увеличенная карточка';
comment on column public.tasks.target_count is 'Количественная цель внутри задания (напр. 30 — "прозвонить 30 контактов"). NULL — задание без количественного прогресса, как раньше (просто выполнено/не выполнено)';
comment on column public.tasks.target_count_label is 'Единица цели для отображения (напр. "контактов", "звонков", "заявок")';

alter table public.task_assignments
  add column if not exists progress_count integer not null default 0;

comment on column public.task_assignments.progress_count is 'Текущий прогресс сотрудника к target_count задания. Обновляется самим сотрудником на странице задания (см. pages/api/tasks/update-progress.js)';
