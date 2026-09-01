-- ============================================================================
-- 006_adaptation_development_plans.sql
--
-- П.8 ТЗ от 24 августа 2026 — план адаптации + параллельный план развития
-- «по тому же принципу».
--
-- 1) kind у планов и шаблонов — 'onboarding' (было единственным вариантом
--    до сих пор, все существующие строки получают его по умолчанию, ничего
--    не ломается) или 'development'. Это позволяет переиспользовать всю уже
--    рабочую машинерию (adaptation_plans/adaptation_plan_events/
--    adaptation_history/весь /api/adaptation/*) для плана развития опытных
--    сотрудников вместо того, чтобы строить параллельный набор таблиц и
--    API с нуля.
--
-- 2) adaptation_plan_events.reminded_at — чтобы cron не слал одно и то же
--    уведомление «событие наступило» повторно при каждом запуске.
--
-- 3) adaptation_history.employee_rating — оценка сотрудником качества
--    полученной обратной связи (отдельно от adaptation_plan_events.rating,
--    который остаётся оценкой руководителем сотрудника).
-- ============================================================================

alter table public.adaptation_plans
  add column if not exists kind text not null default 'onboarding';

alter table public.adaptation_templates
  add column if not exists kind text not null default 'onboarding';

alter table public.adaptation_plan_events
  add column if not exists reminded_at timestamptz;

alter table public.adaptation_history
  add column if not exists employee_rating integer;

comment on column public.adaptation_plans.kind is
  'onboarding (план адаптации новичка) или development (план развития '
  'опытного сотрудника) — используют одну и ту же структуру плана/событий/'
  'журнала, различаются только назначением и набором шаблонов.';
comment on column public.adaptation_history.employee_rating is
  'Оценка сотрудником полученной обратной связи (1-5), заполняется самим '
  'сотрудником в ответ на запись типа feedback — отдельно от '
  'adaptation_plan_events.rating (это оценка руководителем сотрудника).';

-- Примеры шаблонов плана развития (п.8: «3-4 шаблона: развитие до
-- эксперта, руководителя отдела, наставника»). Структура days/events —
-- та же, что уже используют существующие шаблоны адаптации. Компании
-- смогут менять эти шаблоны как угодно — это стартовый набор, не жёсткая
-- заготовка.
insert into public.adaptation_templates (name, kind, is_active, days)
select 'Развитие: путь к эксперту', 'development', true,
  '[
    {"day_number": 1, "events": [
      {"time": "10:00", "title": "Встреча: цели развития на квартал", "type": "meeting", "description": "Обсудить с руководителем зоны роста и договориться о метриках экспертности.", "is_mandatory": true}
    ]},
    {"day_number": 14, "events": [
      {"time": "11:00", "title": "Промежуточная сверка", "type": "feedback", "description": "Обратная связь по прогрессу за 2 недели.", "is_mandatory": true}
    ]},
    {"day_number": 30, "events": [
      {"time": "10:00", "title": "Демонстрация экспертизы", "type": "test", "description": "Показать применение новых навыков на реальном кейсе.", "is_mandatory": true},
      {"time": "15:00", "title": "Итоговая обратная связь", "type": "feedback", "description": "Подведение итогов месяца развития.", "is_mandatory": true}
    ]}
  ]'::jsonb
where not exists (select 1 from public.adaptation_templates where name = 'Развитие: путь к эксперту');

insert into public.adaptation_templates (name, kind, is_active, days)
select 'Развитие: подготовка руководителя отдела', 'development', true,
  '[
    {"day_number": 1, "events": [
      {"time": "10:00", "title": "Встреча: ожидания от роли руководителя", "type": "meeting", "description": "Разбор зон ответственности будущего руководителя отдела.", "is_mandatory": true}
    ]},
    {"day_number": 10, "events": [
      {"time": "11:00", "title": "Тренинг: делегирование и постановка задач", "type": "training", "description": "", "is_mandatory": true}
    ]},
    {"day_number": 20, "events": [
      {"time": "11:00", "title": "Пробное управление мини-командой", "type": "test", "description": "Взять временное кураторство над частью команды.", "is_mandatory": true}
    ]},
    {"day_number": 30, "events": [
      {"time": "15:00", "title": "Итоговая обратная связь и решение", "type": "feedback", "description": "Готовность к переходу в руководящую роль.", "is_mandatory": true}
    ]}
  ]'::jsonb
where not exists (select 1 from public.adaptation_templates where name = 'Развитие: подготовка руководителя отдела');

insert into public.adaptation_templates (name, kind, is_active, days)
select 'Развитие: путь наставника', 'development', true,
  '[
    {"day_number": 1, "events": [
      {"time": "10:00", "title": "Встреча: зачем становиться наставником", "type": "meeting", "description": "", "is_mandatory": true}
    ]},
    {"day_number": 7, "events": [
      {"time": "11:00", "title": "Тренинг: основы наставничества", "type": "training", "description": "", "is_mandatory": true}
    ]},
    {"day_number": 21, "events": [
      {"time": "11:00", "title": "Первая сессия наставничества (наблюдение)", "type": "test", "description": "Руководитель наблюдает за сессией с младшим сотрудником.", "is_mandatory": true}
    ]},
    {"day_number": 30, "events": [
      {"time": "15:00", "title": "Обратная связь по наставничеству", "type": "feedback", "description": "", "is_mandatory": true}
    ]}
  ]'::jsonb
where not exists (select 1 from public.adaptation_templates where name = 'Развитие: путь наставника');

notify pgrst, 'reload schema';
