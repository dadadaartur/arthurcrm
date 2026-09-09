-- ============================================================================
-- 016_metric_reward_image.sql  (НОВЫЙ файл — не давал раньше)
--
-- П.3 из большого списка фидбека (27 августа 2026): «можно добавить туда
-- возможность загрузки аватара и информации о подарке за выполнение
-- цели» — чтобы сотруднику визуально хотелось заполнить шкалу.
-- ============================================================================

alter table public.kpi_metrics
  add column if not exists reward_image_url text;

alter table public.kpi_metrics
  add column if not exists reward_description text;

comment on column public.kpi_metrics.reward_image_url is
  'Фото приза за достижение максимального уровня показателя — мотивационный элемент на карточке цели.';
comment on column public.kpi_metrics.reward_description is
  'Описание приза (например, "Сертификат в ресторан на 5000р" или "Отгул на выбор").';

notify pgrst, 'reload schema';
