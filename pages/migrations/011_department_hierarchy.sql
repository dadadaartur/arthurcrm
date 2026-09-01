-- ============================================================================
-- 011_department_hierarchy.sql  (НОВЫЙ файл — не давал раньше)
--
-- Фаза H, п.6 ТЗ — архитектура компании: отделы произвольной вложенности
-- (подтверждено вами: не фиксированные уровни, а дерево любой глубины) +
-- прямая линия подчинения сотрудник -> руководитель, независимая от
-- отдела (можно назначить руководителя и до того, как оргструктура
-- расставлена по отделам).
--
-- ВАЖНО про типы столбцов: после двух эпизодов в этой сессии (company_id
-- оказался bigint, а не uuid, как я предполагал) — на этот раз НЕ гадаю.
-- Миграция сама определяет реальный тип departments.id через
-- information_schema и создаёт parent_department_id того же типа. Если
-- departments.id — bigint, столбец будет bigint; если uuid — будет uuid.
-- Сработает корректно в обоих случаях без моего предположения.
-- ============================================================================

do $$
declare
  dept_id_type text;
begin
  select data_type into dept_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'departments' and column_name = 'id';

  if dept_id_type is null then
    raise notice 'Таблица departments или её столбец id не найдены — пропускаю (сообщите об этом, если увидите это уведомление)';
    return;
  end if;

  if dept_id_type = 'uuid' then
    execute 'alter table public.departments add column if not exists parent_department_id uuid references public.departments(id) on delete set null';
  elsif dept_id_type in ('bigint', 'integer', 'smallint') then
    execute format('alter table public.departments add column if not exists parent_department_id %s references public.departments(id) on delete set null', dept_id_type);
  else
    raise notice 'Неожиданный тип departments.id: % — столбец parent_department_id не создан, сообщите мне этот тип', dept_id_type;
  end if;
end $$;

-- Кто возглавляет отдел — ссылка на auth.users (этот тип везде в проекте
-- подтверждённо uuid, включая уже успешно применённые миграции 006/008).
alter table public.departments
  add column if not exists manager_user_id uuid references auth.users(id) on delete set null;

-- Прямая линия подчинения — независимо от отдела.
alter table public.profiles
  add column if not exists manager_id uuid references auth.users(id) on delete set null;

comment on column public.departments.parent_department_id is
  'Родительский отдел — дерево произвольной глубины (компания сама решает, сколько уровней вложенности использовать).';
comment on column public.departments.manager_user_id is
  'Руководитель отдела.';
comment on column public.profiles.manager_id is
  'Непосредственный руководитель сотрудника — не привязано жёстко к отделу, можно назначить отдельно.';

notify pgrst, 'reload schema';
