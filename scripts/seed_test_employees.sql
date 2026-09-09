-- Тестовые сотрудники (пункт 8 фидбека от 2 сентября 2026) — версия
-- попроще: раньше нужно было самостоятельно искать числовые id
-- компании и роли в базе, теперь достаточно вписать НАЗВАНИЕ компании
-- (то, что вы точно знаете, раз сами её создавали) — id компании и
-- роль «Сотрудник» скрипт находит сам.
--
-- ЧТО СДЕЛАТЬ: замените 'ВАША КОМПАНИЯ' на точное название ниже в
-- строке v_company_name — и всё, дальше просто запустите файл целиком
-- в SQL-редакторе Supabase.

do $$
declare
  v_company_name text := 'ВАША КОМПАНИЯ'; -- ← замените на точное название своей компании
  v_company_id bigint;
  v_role_id bigint;
  v_user_id uuid;
  v_password text := crypt('TestPass123!', gen_salt('bf'));
  i int;
  v_names text[] := array['Иванова Анна','Петров Дмитрий','Сидорова Елена','Кузнецов Игорь','Смирнова Ольга','Попов Сергей','Волкова Мария','Соколов Артём','Морозова Дарья','Лебедев Николай'];
  v_hire_offsets int[] := array[400, 250, 45, 10, 180, 3, 500, 90, 20, 600]; -- дней назад — смесь «новых» и «опытных»
begin
  -- Ищем компанию по названию сами — не нужно искать id вручную.
  select id into v_company_id from public.companies where name = v_company_name limit 1;
  if v_company_id is null then
    raise exception 'Компания с названием "%" не найдена. Проверьте точное название в разделе платформы, где видите список компаний (регистр и пробелы должны совпадать в точности)', v_company_name;
  end if;

  -- Ищем роль рядового сотрудника в этой же компании — тоже сами, не
  -- нужно искать id вручную. Если ролей с названием "Сотрудник" нет
  -- (например, её переименовали) — берём любую роль этой компании,
  -- которая не "Администратор", как разумный запасной вариант.
  select id into v_role_id from public.roles where company_id = v_company_id and name = 'Сотрудник' limit 1;
  if v_role_id is null then
    select id into v_role_id from public.roles where company_id = v_company_id and name != 'Администратор' limit 1;
  end if;
  if v_role_id is null then
    raise exception 'В компании "%" не нашлось ни одной роли, кроме "Администратор" — создайте хотя бы одну обычную роль сотрудника перед запуском этого скрипта', v_company_name;
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

    -- upsert, не обычный insert — судя по ошибке от вас, в проекте
    -- есть триггер на auth.users, который сам создаёт черновую запись
    -- в profiles ещё до этой строки (так же на это указывает upsert,
    -- а не insert, в родном pages/api/create-company.js). Обычный
    -- insert конфликтовал бы с уже существующей записью по этому же
    -- user_id — этой правкой чиню именно то, о чём вы сообщили.
    insert into public.profiles (user_id, company_id, role_id, is_company_admin, email, display_name, first_name, last_name, hire_date)
    values (
      v_user_id, v_company_id, v_role_id, false,
      'test-seed-' || i || '@example.com', v_names[i],
      split_part(v_names[i], ' ', 2), split_part(v_names[i], ' ', 1),
      (now() - (v_hire_offsets[i] || ' days')::interval)::date
    )
    on conflict (user_id) do update set
      company_id = excluded.company_id,
      role_id = excluded.role_id,
      is_company_admin = excluded.is_company_admin,
      email = excluded.email,
      display_name = excluded.display_name,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      hire_date = excluded.hire_date;
  end loop;

  raise notice 'Готово — создано 10 тестовых сотрудников в компании "%" (id %)', v_company_name, v_company_id;
end $$;

-- ─────────────────────────────────────────────────────────────────
-- ОЧИСТКА — когда закончите проверять, удаляет всех 10 одним разом
-- по явной метке в email, никого другого не затронет.
-- ─────────────────────────────────────────────────────────────────
-- delete from auth.users where email like 'test-seed-%@example.com';
