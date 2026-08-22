-- ============================================================================
-- 004_minor_db_hygiene.sql
--
-- Две мелкие находки аудита (низкий приоритет, не критично для безопасности):
--
-- 1) На payments.yookassa_payment_id нет unique-индекса, хотя по этому полю
--    ищут через .maybeSingle() в webhook (pages/api/payments/callback.js) и
--    в ручной проверке (check-status.js) — логически оно должно быть
--    уникальным. Если по какой-то причине в таблице уже есть дубликаты,
--    этот ALTER упадёт — сначала проверьте:
--      select yookassa_payment_id, count(*) from public.payments
--      group by yookassa_payment_id having count(*) > 1;
--
-- 2) admin_users имеет два идентичных unique-индекса на user_id
--    (admin_users_pkey и admin_users_user_id_key) — судя по всему, от
--    повторного применения миграции. Второй избыточен, можно убрать.
-- ============================================================================

create unique index if not exists payments_yookassa_payment_id_key
  on public.payments (yookassa_payment_id);

drop index if exists public.admin_users_user_id_key;

notify pgrst, 'reload schema';
