-- ============================================================================
-- 013_department_scoped_content.sql  (НОВЫЙ файл — не давал раньше)
--
-- Сценарий от 26 августа 2026: разные отделы (например, продажи новым
-- лидам и продажи текущим клиентам) должны иметь РАЗНЫЕ цели и задания —
-- «каждая команда — отдельное пространство, а уровень доступа к
-- информации определяет вышестоящий уровень».
--
-- department_id = NULL — общее для всей компании (видно всем, как и было
-- раньше — ни один существующий показатель или задание не меняет
-- поведения). department_id = конкретный отдел — видно только этому
-- отделу и всем вложенным в него (логистика и продажи — разные ветки,
-- друг друга не видят; «Продажи-Москва» видит то, что назначено на
-- «Продажи» уровнем выше, но не то, что назначено на «Продажи-Питер»).
--
-- Тип столбца определяется автоматически по реальному departments.id —
-- та же самоопределяющаяся техника, что в миграции 011, чтобы не гадать
-- второй раз в этой же сессии.
do $$
declare
  dept_id_type text;
begin
  select data_type into dept_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'departments' and column_name = 'id';

  if dept_id_type is null then
    raise notice 'departments.id не найден — сначала примените миграцию 011, затем эту';
    return;
  end if;

  execute format('alter table public.kpi_metrics add column if not exists department_id %s references public.departments(id) on delete set null', dept_id_type);
  execute format('alter table public.tasks add column if not exists department_id %s references public.departments(id) on delete set null', dept_id_type);
end $$;

comment on column public.kpi_metrics.department_id is
  'NULL — показатель общий для всей компании. Иначе — виден только этому отделу и всем вложенным в него (не родителям, не соседним веткам).';
comment on column public.tasks.department_id is
  'NULL — задание общее для всей компании. Иначе — виден только этому отделу и всем вложенным в него.';

notify pgrst, 'reload schema';
