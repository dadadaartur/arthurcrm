-- ============================================================================
-- 003_profiles_privilege_columns.sql
--
-- Защищает "привилегированные" колонки profiles (is_company_admin, role_id,
-- can_create_tasks, can_review_tasks, can_manage_employees,
-- can_delete_employees, company_id, deleted_at) от изменения напрямую с
-- клиента в обход прав — независимо от того, как именно сформулирована
-- ваша текущая RLS-политика UPDATE на profiles, которую я не вижу
-- напрямую (нет доступа к вашей БД).
--
-- ПОЧЕМУ ТРИГГЕР, А НЕ ПРАВКА RLS-ПОЛИТИКИ: обычная RLS-политика вида
-- "USING (auth.uid() = user_id)" ограничивает, КАКИЕ СТРОКИ доступны, но
-- не то, КАКИЕ КОЛОНКИ можно менять в разрешённой строке. Если у вас
-- сейчас именно такая политика — сотрудник, открыв консоль браузера,
-- теоретически мог вызвать supabase.from('profiles')
-- .update({is_company_admin: true}).eq('user_id', <свой id>) и стать
-- админом компании в одну строку кода. Триггер работает на уровне самой
-- таблицы и защищает от этого независимо от формулировки политики.
--
-- Заодно закрывает похожий момент в pages/company-admin/employees.js —
-- редактирование сотрудника там тоже идёт прямым клиентским update(), и
-- поле is_company_admin туда никогда не передаётся ни при каких условиях
-- (проверено по коду), так что блокировать его безусловно безопасно и не
-- сломает существующий функционал.
--
-- Проверено по коду приложения: is_company_admin и company_id сейчас НИГДЕ
-- не меняются после создания профиля ни одним клиентским путём — поэтому
-- они блокируются безусловно. role_id и can_* легитимно меняет админ
-- компании ДРУГОМУ сотруднику (pages/company-admin/employees.js) — это
-- продолжает работать, блокируется только смена этих полей САМИМ СОБОЙ.
--
-- ⚠️ Это дополнение к, а не замена pages/api/profile/update.js — тот
-- эндпоинт остаётся основным путём редактирования профиля из приложения.
-- Прогоните на стейджинге перед продакшеном, как и остальные миграции.
-- ============================================================================

create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  -- auth.uid() = null означает, что запрос пришёл через service_role
  -- (серверные API-роуты приложения) — там доверие обеспечивается
  -- проверками в самом коде роута (requireAuth/isCompanyAdmin и т.п.),
  -- триггер их не трогает.
  if v_caller is null then
    return new;
  end if;

  -- Эти два поля сейчас не меняются никаким клиентским путём в принципе —
  -- блокируем всегда, кто бы ни обращался напрямую с клиента.
  new.company_id := old.company_id;
  new.is_company_admin := old.is_company_admin;

  -- Остальные привилегированные поля — блокируем, только если человек
  -- редактирует СВОЙ ЖЕ профиль и сам ещё не админ компании/платформы
  -- (админу можно редактировать чужие строки — see pages/company-admin/employees.js).
  if v_caller = old.user_id
     and coalesce(old.is_company_admin, false) = false
     and not (old.role_id = 1 and old.company_id is null) then
    new.role_id := old.role_id;
    new.can_create_tasks := old.can_create_tasks;
    new.can_review_tasks := old.can_review_tasks;
    new.can_manage_employees := old.can_manage_employees;
    new.can_delete_employees := old.can_delete_employees;
    new.deleted_at := old.deleted_at;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_privileged_profile_columns on public.profiles;
create trigger protect_privileged_profile_columns
  before update on public.profiles
  for each row execute function public.protect_privileged_profile_columns();

notify pgrst, 'reload schema';
