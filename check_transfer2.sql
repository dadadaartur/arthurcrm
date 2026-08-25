select
  'karma_balance: уникальность user_id' as проверка,
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'karma_balance'
      and indexdef ilike '%unique%' and indexdef ilike '%user_id%'
  ) as ок
union all
select 'функция transfer_karma существует',
  exists (select 1 from pg_proc where proname = 'transfer_karma')
union all
select 'у companies есть status = active хотя бы у одной строки',
  exists (select 1 from public.companies where status = 'active');
