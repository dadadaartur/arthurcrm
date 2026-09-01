-- ============================================================================
-- 009_shop_showcase.sql
--
-- П.12 ТЗ от 24 августа 2026 — витрина магазина: лента акций/топ-товаров
-- наверху, категории товаров от партнёров.
--
-- Три новых nullable/со значением по умолчанию поля у rewards — ни одна
-- существующая строка не меняется, лента просто изначально пуста, пока
-- админ не отметит что-то как топ/акцию, категории просто не показываются,
-- пока не заполнено хотя бы одно partner_name.
-- ============================================================================

alter table public.rewards
  add column if not exists is_featured boolean not null default false;

alter table public.rewards
  add column if not exists promo_label text;

alter table public.rewards
  add column if not exists partner_name text;

comment on column public.rewards.is_featured is
  'Показывать в верхней ленте магазина как топ-товар.';
comment on column public.rewards.promo_label is
  'Короткая промо-метка для ленты магазина ("Скидка 20%", "Новинка"). '
  'NULL — не показывается в ленте акций (но может быть в топ-товарах, '
  'если is_featured = true).';
comment on column public.rewards.partner_name is
  'Партнёр, к категории которого относится товар (для фильтра категорий '
  'в магазине) — независимо от requires_unlock: партнёрский товар может '
  'быть открыт всем сразу или требовать выполнения задания партнёра.';

notify pgrst, 'reload schema';
