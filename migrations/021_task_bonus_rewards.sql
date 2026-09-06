-- Комбо-награды партнёрских заданий (пункт 3 фидбека от 1 сентября
-- 2026) — раньше reward_type/reward_config допускали только ОДИН тип
-- награды за раз (радио-кнопка: только кармики / открыть товары /
-- буст) — нельзя было скомбинировать буст + приз, например. Новое
-- поле bonus_rewards — массив, каждый элемент независимый бонус,
-- можно сколько угодно сразу. Старые reward_type/reward_config не
-- трогаем и не удаляем — уже созданные задания продолжают работать
-- через них без изменений, это чисто аддитивное расширение.

alter table public.tasks
  add column if not exists bonus_rewards jsonb;

comment on column public.tasks.bonus_rewards is 'Массив бонусных наград сверх обычных кармиков, каждая — {type: "unlock"|"boost"|"prize", ...}. unlock: {unlockKey}. boost: {percent, durationDays}. prize: {label, description, imageUrl}. NULL/пусто — задание без бонусов либо использует старое одиночное reward_type (обратная совместимость)';
