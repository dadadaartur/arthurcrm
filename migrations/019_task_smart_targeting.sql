-- Гибкий таргетинг заданий (раунд «работа над заданиями», 1 сентября
-- 2026, пункт 3) — новые режимы target_role: level (по уровню
-- мастерства), metric_below (не достигает порога по показателю,
-- включая отсутствие данных), energy_bottom (N сотрудников с
-- наименьшей энергией). См. lib/taskAudience.js — единый резолвер,
-- который эти поля читает.

-- ⚠️ ПРЕДПОЛОЖЕНИЕ О ТИПАХ: bigint для ссылок на progress_levels.id и
-- kpi_metrics.id — по тому же принципу, что и в предыдущих миграциях
-- (я не подключён к вашей базе напрямую, см. migrations/README.md).
-- Если в вашей схеме эти id имеют тип uuid, замените bigint на uuid
-- ниже перед применением — в остальном миграция не изменится.
alter table public.tasks
  add column if not exists target_level_ids bigint[],
  add column if not exists target_metric_id bigint references public.kpi_metrics(id) on delete set null,
  add column if not exists target_metric_rank smallint,
  add column if not exists target_bottom_n smallint;

comment on column public.tasks.target_level_ids is 'Для target_role=level — список id уровней мастерства (progress_levels), сотрудники на любом из них попадают в аудиторию';
comment on column public.tasks.target_metric_id is 'Для target_role=metric_below — id показателя (kpi_metrics), по которому проверяется "не достигает выбранного уровня или нет данных за сегодня"';
comment on column public.tasks.target_metric_rank is 'Для target_role=metric_below — целевой ранг порога (1 = минимальный уровень и выше, 2 = средний и выше и т.д.). По умолчанию 1, если не задан';
comment on column public.tasks.target_bottom_n is 'Для target_role=energy_bottom — сколько сотрудников с наименьшей энергией включить (по умолчанию 5, см. lib/taskAudience.js)';
