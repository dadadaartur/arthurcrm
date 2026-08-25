-- Диагностика 500-й ошибки при переводе. Только чтение, ничего не меняет.
-- Пришлите результат целиком — по нему будет видно точную причину.

-- 1) Есть ли у karma_balance.user_id уникальный индекс/constraint —
--    без него сломается "on conflict (user_id)" внутри transfer_karma.
select
  'karma_balance: уникальность user_id' as проверка,
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'karma_balance'
      and indexdef ilike '%unique%' and indexdef ilike '%user_id%'
  ) as ок
union all
-- 2) Существует ли сама функция transfer_karma в базе прямо сейчас.
select 'функция transfer_karma существует',
  exists (select 1 from pg_proc where proname = 'transfer_karma')
union all
-- 3) Есть ли строка компании отправителя со статусом ровно 'active' —
--    функция ругается, если status не равен именно этой строке.
select 'у companies есть status = active хотя бы у одной строки',
  exists (select 1 from public.companies where status = 'active');

-- 4) Точные типы колонок, которые использует функция — свериться глазами.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    ('karma_balance','user_id'), ('karma_balance','balance'),
    ('transfers','from_user_id'), ('transfers','to_user_id'), ('transfers','amount'),
    ('companies','id'), ('companies','status'),
    ('profiles','company_id'), ('profiles','deleted_at')
  )
order by table_name, column_name;
