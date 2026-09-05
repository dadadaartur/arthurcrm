-- Тестовые сотрудники для проверки поведения платформы при большом
-- количестве людей (пункт 8 фидбека от 2 сентября 2026). Создаёт
-- ОДНОВРЕМЕННО auth.users и profiles — обычно это делает Admin API
-- Supabase (как при создании компании), но для быстрого теста
-- допустимо и напрямую через SQL, это известный, рабочий паттерн.
--
-- ⚠️ ПЕРЕД ЗАПУСКОМ: впишите ниже реальный id вашей тестовой компании
-- и id роли рядового сотрудника в ней (SELECT id FROM roles WHERE
-- company_id = ваш_id AND name = 'Сотрудник' LIMIT 1).
--
-- Все 10 сотрудников получают email вида test-seed-N@example.com —
-- эта явная метка в адресе нужна для безопасной очистки одним запросом
-- в конце файла, не задев ни одного реального сотрудника.

do $$
declare
  v_company_id bigint := 0; -- ← впишите id вашей тестовой компании
  v_role_id bigint := 0;    -- ← впишите id роли "Сотрудник" в этой компании
  v_user_id uuid;
  v_password text := crypt('TestPass123!', gen_salt('bf'));
  i int;
  v_names text[] := array['Иванова Анна','Петров Дмитрий','Сидорова Елена','Кузнецов Игорь','Смирнова Ольга','Попов Сергей','Волкова Мария','Соколов Артём','Морозова Дарья','Лебедев Николай'];
  v_hire_offsets int[] := array[400, 250, 45, 10, 180, 3, 500, 90, 20, 600]; -- дней назад — смесь «новых» и «опытных»
begin
  if v_company_id = 0 or v_role_id = 0 then
    raise exception 'Впишите реальные v_company_id и v_role_id перед запуском — см. комментарий выше';
  end if;

  for i in 1..10 loop
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      'test-seed-' || i || '@example.com', v_password,
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}', false,
      '', '', '', ''
    );

    insert into public.profiles (user_id, company_id, role_id, is_company_admin, email, display_name, first_name, last_name, hire_date)
    values (
      v_user_id, v_company_id, v_role_id, false,
      'test-seed-' || i || '@example.com', v_names[i],
      split_part(v_names[i], ' ', 2), split_part(v_names[i], ' ', 1),
      (now() - (v_hire_offsets[i] || ' days')::interval)::date
    );
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────
-- ОЧИСТКА — когда закончите проверять, удаляет всех 10 одним разом
-- по явной метке в email. task_assignments/kpi_entries и т.д. на этих
-- пользователей удалятся автоматически, если внешние ключи настроены
-- с on delete cascade (как в большинстве таблиц этого проекта) — если
-- какая-то таблица без каскада вернёт ошибку внешнего ключа, удалите
-- сначала записи там вручную по этим же user_id.
-- ─────────────────────────────────────────────────────────────────
-- delete from auth.users where email like 'test-seed-%@example.com';
