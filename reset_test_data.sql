-- ============================================================================
-- reset_test_data.sql  (НОВЫЙ файл — разрушительная операция)
--
-- Удаляет ВСЕ компании и всё, что к ним привязано (сотрудников, отделы,
-- цели, задания, переводы, покупки, историю адаптации и т.д.), оставляя
-- только учётку супер-админа arturgalkin.ru@mail.ru.
--
-- ПЕРЕД ЗАПУСКОМ: сделайте бэкап в Supabase (Database -> Backups), если
-- он ещё не настроен автоматически — это необратимо.
--
-- Обёрнуто в транзакцию: если что-то пойдёт не так на середине (например,
-- я не учёл какую-то таблицу со внешним ключом) — откатится ВСЁ, база не
-- останется в наполовину удалённом состоянии.
--
-- Не трогает auth.users напрямую (это защищённая таблица Supabase Auth,
-- удаление через неё может вести себя не так, как обычный DELETE) —
-- только данные в public-схеме. Аккаунты уволенных/тестовых сотрудников
-- при желании удалите отдельно через Supabase Dashboard -> Authentication,
-- это безопаснее, чем через SQL.
-- ============================================================================

begin;

-- Останавливаемся, если вдруг не находим супер-админа — лучше ничего не
-- удалить, чем удалить всё по ошибке.
do $$
declare
  founder_id uuid;
begin
  select id into founder_id from auth.users where email = 'arturgalkin.ru@mail.ru';
  if founder_id is null then
    raise exception 'Не нашёл пользователя arturgalkin.ru@mail.ru в auth.users — останавливаюсь, ничего не удаляю';
  end if;
end $$;

delete from public.karma_transactions where user_id != (select id from auth.users where email = 'arturgalkin.ru@mail.ru');
delete from public.transfers where from_user_id != (select id from auth.users where email = 'arturgalkin.ru@mail.ru')
  or to_user_id != (select id from auth.users where email = 'arturgalkin.ru@mail.ru');
delete from public.purchases where company_id is not null;
delete from public.karma_boosts where company_id is not null;
delete from public.employee_unlocks;
delete from public.task_assignments;
delete from public.task_auto_grants;
delete from public.tasks where company_id is not null;
delete from public.kpi_entries where company_id is not null;
delete from public.kpi_energy;
delete from public.kpi_trainings;
delete from public.adaptation_history;
delete from public.adaptation_plan_events;
delete from public.adaptation_plans where company_id is not null;
delete from public.goals where company_id is not null;
delete from public.global_goals where company_id is not null;
delete from public.notifications;
delete from public.invitations where company_id is not null;
delete from public.kpi_metrics where company_id is not null;
delete from public.rewards where company_id is not null;
delete from public.departments where company_id is not null;
delete from public.karma_balance where user_id != (select id from auth.users where email = 'arturgalkin.ru@mail.ru');
delete from public.profiles where email != 'arturgalkin.ru@mail.ru';
delete from public.companies;

commit;

-- Проверка после выполнения — должна остаться ровно 1 строка.
select count(*) as "профилей осталось (должно быть 1)" from public.profiles;
