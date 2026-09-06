-- Реалистичные тестовые данные показателей (пункт 3 фидбека от
-- 2 сентября 2026) — заполняет каждому сотруднику каждый прямой
-- (не формульный) показатель на каждый день с 2026-08-01 по 2026-09-06.
-- Каждой паре «сотрудник-показатель» случайно достаётся одна из
-- четырёх траекторий, чтобы дашборды и графики было на чём проверять
-- ближе к реальности, а не на одинаковых плоских цифрах:
--   growth     — устойчивый рост от начала к концу периода
--   decline    — устойчивое падение
--   stagnation — почти без изменений, минимальный шум
--   volatile   — большой разброс изо дня в день без выраженного тренда
--
-- ЧТО СДЕЛАТЬ: впишите название компании ниже и запустите файл целиком.
-- Безопасно запускать повторно — использует upsert, старые значения на
-- те же даты просто перезапишутся новыми, задвоения не будет.

do $$
declare
  v_company_name text := 'ВАША КОМПАНИЯ'; -- ← замените на точное название своей компании
  v_company_id bigint;
  v_start date := '2026-08-01';
  v_end date := '2026-09-06';
  r_emp record;
  r_metric record;
  v_pattern text;
  v_base numeric;
  v_day date;
  v_day_idx int;
  v_total_days int;
  v_progress numeric;
  v_value numeric;
  v_noise numeric;
  v_count int := 0;
begin
  select id into v_company_id from public.companies where name = v_company_name limit 1;
  if v_company_id is null then
    raise exception 'Компания "%" не найдена — проверьте точное название', v_company_name;
  end if;

  v_total_days := (v_end - v_start);

  for r_emp in (select user_id from public.profiles where company_id = v_company_id and is_company_admin = false and deleted_at is null) loop
    for r_metric in (select id, kpi_type from public.kpi_metrics where company_id = v_company_id and formula is null) loop
      -- Траектория закрепляется за парой сотрудник-показатель один раз
      -- (не на каждый день заново) — иначе за месяц у одного человека
      -- по одному показателю выходил бы то рост, то падение вперемешку,
      -- что не похоже на реальную динамику.
      v_pattern := (array['growth','decline','stagnation','volatile'])[floor(random()*4)+1];
      v_base := 35 + random()*20; -- стартовая база 35-55, чтобы не начинать от нуля

      v_day_idx := 0;
      v_day := v_start;
      while v_day <= v_end loop
        v_progress := v_day_idx::numeric / greatest(v_total_days, 1);
        v_noise := (random() - 0.5) * 6; -- ±3 обычный шум дня

        if v_pattern = 'growth' then
          v_value := v_base + v_progress * 45 + v_noise;
        elsif v_pattern = 'decline' then
          v_value := (v_base + 45) - v_progress * 45 + v_noise;
        elsif v_pattern = 'stagnation' then
          v_value := v_base + v_noise * 0.7;
        else -- volatile
          v_value := v_base + (random() - 0.5) * 50;
        end if;

        v_value := greatest(0, round(v_value::numeric, 1));

        insert into public.kpi_entries (metric_id, user_id, entry_date, value)
        values (r_metric.id, r_emp.user_id, v_day, v_value)
        on conflict (metric_id, user_id, entry_date) do update set value = excluded.value;

        v_count := v_count + 1;
        v_day := v_day + 1;
        v_day_idx := v_day_idx + 1;
      end loop;
    end loop;
  end loop;

  raise notice 'Готово — записано % значений показателей за % дней', v_count, v_total_days + 1;
end $$;

-- ─────────────────────────────────────────────────────────────────
-- ОЧИСТКА — если захотите убрать именно эти тестовые данные, удаляет
-- все записи показателей в этом диапазоне дат для сотрудников этой
-- компании (замените название компании так же, как выше).
-- ─────────────────────────────────────────────────────────────────
-- delete from public.kpi_entries
-- where entry_date between '2026-08-01' and '2026-09-06'
--   and user_id in (select user_id from public.profiles where company_id = (select id from public.companies where name = 'ВАША КОМПАНИЯ'));
