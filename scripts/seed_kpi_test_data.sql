-- Тестовые данные показателей на период (пункт 3 фидбека от 6 сентября
-- 2026) — каждый день с 1 августа по 6 сентября, для всех сотрудников
-- компании и всех активных показателей, с разными трендами (падение/
-- стагнация/рост) плюс случайный шум, чтобы графики и дашборды можно
-- было погонять на данных, близких к реальности, а не на плоской
-- линии одинаковых чисел.
--
-- ЧТО СДЕЛАТЬ: впишите название компании ниже и запустите файл целиком
-- в SQL-редакторе Supabase.
--
-- ⚠️ Безопасно перезапускать — сначала удаляет свои же старые записи
-- за этот период (только для сотрудников указанной компании), потом
-- вставляет заново. Не полагается на ограничение уникальности в базе
-- (по коду проекта похоже, что такого ограничения нет) — вместо этого
-- сначала явно удаляет, потом вставляет, а не использует ON CONFLICT.

do $$
declare
  v_company_name text := 'ВАША КОМПАНИЯ'; -- ← замените на точное название своей компании
  v_period_from date := '2026-08-01';
  v_period_to date := '2026-09-06';
  v_company_id bigint;
  emp record;
  metric record;
  d date;
  v_trend int; -- 1 = падение, 2 = стагнация, 3 = рост
  v_base_pct numeric;
  v_day_idx int;
  v_total_days int;
  v_pct numeric;
  v_val numeric;
  v_rows_inserted int := 0;
begin
  select id into v_company_id from public.companies where name = v_company_name limit 1;
  if v_company_id is null then
    raise exception 'Компания с названием "%" не найдена — проверьте точное название', v_company_name;
  end if;

  v_total_days := greatest(1, v_period_to - v_period_from);

  -- Удаляем свои же старые тестовые данные за этот период перед
  -- перегенерацией — безопасно перезапускать скрипт сколько угодно раз.
  delete from public.kpi_entries
  where entry_date between v_period_from and v_period_to
    and user_id in (select user_id from public.profiles where company_id = v_company_id and is_company_admin = false and deleted_at is null);

  for emp in
    select user_id from public.profiles
    where company_id = v_company_id and is_company_admin = false and deleted_at is null
  loop
    for metric in
      select id, thr_min, thr_mid, thr_top, thr_ultra from public.kpi_metrics
      where company_id = v_company_id and is_active = true
    loop
      -- Тренд и стартовая точка выбираются один раз на пару
      -- сотрудник+показатель — весь период идёт по этой же логике,
      -- не дёргается случайно изо дня в день.
      v_trend := 1 + floor(random() * 3)::int;
      v_base_pct := 0.55 + random() * 0.35; -- старт в районе 55-90% от порога «топ»

      d := v_period_from;
      v_day_idx := 0;
      while d <= v_period_to loop
        v_pct := v_base_pct
          + case v_trend
              when 1 then -0.35 * (v_day_idx::numeric / v_total_days) -- падение, до -35% к концу периода
              when 3 then 0.45 * (v_day_idx::numeric / v_total_days)  -- рост, до +45% к концу периода
              else 0                                                   -- стагнация — без направленного тренда
            end
          + (random() - 0.5) * 0.12; -- случайный шум ±6%, день на день не похож
        v_pct := greatest(0.05, least(1.35, v_pct));
        v_val := round((v_pct * metric.thr_top)::numeric, 1);
        if v_val < 0 then v_val := 0; end if;

        insert into public.kpi_entries (company_id, metric_id, user_id, entry_date, value)
        values (v_company_id, metric.id, emp.user_id, d, v_val);
        v_rows_inserted := v_rows_inserted + 1;

        d := d + 1;
        v_day_idx := v_day_idx + 1;
      end loop;
    end loop;
  end loop;

  raise notice 'Готово — вставлено % записей показателей для компании "%" за период % — %', v_rows_inserted, v_company_name, v_period_from, v_period_to;
end $$;

-- ─────────────────────────────────────────────────────────────────
-- ОЧИСТКА — вернуть как было, удалить все сгенерированные записи
-- за этот период для сотрудников компании.
-- ─────────────────────────────────────────────────────────────────
-- delete from public.kpi_entries where entry_date between '2026-08-01' and '2026-09-06'
--   and user_id in (select user_id from public.profiles where company_id = (select id from public.companies where name = 'ВАША КОМПАНИЯ') and is_company_admin = false);
