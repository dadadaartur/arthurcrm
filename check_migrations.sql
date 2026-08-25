-- Диагностика: какие из миграций 005–009 реально применены в базе.
-- Выполните целиком и пришлите результат — по нему сразу будет видно,
-- в чём причина, без дальнейших догадок.
select
  'kpi_metrics.thresholds (005)' as проверка,
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='kpi_metrics' and column_name='thresholds') as применено
union all
select 'tasks.auto_target_rank (005)',
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='auto_target_rank')
union all
select 'adaptation_plans.kind (006)',
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='adaptation_plans' and column_name='kind')
union all
select 'kpi_metrics.source_config (007)',
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='kpi_metrics' and column_name='source_config')
union all
select 'tasks.partner_name (008)',
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='partner_name')
union all
select 'karma_boosts таблица (008)',
  exists (select 1 from information_schema.tables where table_schema='public' and table_name='karma_boosts')
union all
select 'rewards.is_featured (009)',
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='rewards' and column_name='is_featured')
order by 1;
