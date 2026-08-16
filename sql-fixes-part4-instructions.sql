-- ЧАСТЬ 4/4: Финальные проверки и инструкции
-- Этот файл содержит итоговые проверки и рекомендации

-- =====================================================
-- ИНСТРУКЦИЯ ПО ПРИМЕНЕНИЮ ИСПРАВЛЕНИЙ
-- =====================================================

-- ШАГ 1: Примените исправления по порядку в SQL Editor Supabase
-- ---------------------------------------------------------
-- 1. Откройте https://app.supabase.com/project/YOUR_PROJECT/sql
-- 2. Скопируйте содержимое sql-fixes-part1-duplicates.sql
-- 3. Нажмите "Run" и убедитесь что нет ошибок
-- 4. Повторите для part2, part3, part4

-- ШАГ 2: Проверьте что политики применились
-- ---------------------------------------------------------
-- Выполните этот запрос чтобы увидеть обновленные политики:
/*
SELECT 
    tablename,
    policyname,
    cmd as operation,
    array_to_string(roles, ', ') as roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('admin_stickers', 'profiles', 'karma_balance', 'transfers')
ORDER BY tablename, policyname;
*/

-- ШАГ 3: Протестируйте критические сценарии
-- ---------------------------------------------------------
-- 1. Попробуйте создать перевод кармы с недостаточным балансом - должен быть отказ
-- 2. Попробуйте изменить role_id в profiles обычным пользователем - должен быть отказ  
-- 3. Попробуйте удалить стикер другого пользователя - должен быть отказ
-- 4. Убедитесь что администраторы могут выполнять свои операции

-- ШАГ 4: Мониторинг после применения
-- ---------------------------------------------------------
-- Следите за логами Supabase на предмет ошибок 403 (Forbidden)
-- Если легитимные операции блокируются - проверьте логи ошибок

-- =====================================================
-- ДОПОЛНИТЕЛЬНЫЕ РЕКОМЕНДАЦИИ
-- =====================================================

-- 1. Rate Limiting уже добавлен в API файлы:
--    - create-company.js: 5 запросов/мин
--    - transfer.js: 10 запросов/мин  
--    - colleagues/search.js: 30 запросов/мин
--    - company-admin/karma.js: 20 запросов/мин

-- 2. Утечка email исправлена в colleagues/search.js
--    Теперь email коллег возвращается как null

-- 3. Критическая ошибка email_confirmed_at исправлена в create-company.js

-- =====================================================
-- ОТКАТ ИЗМЕНЕНИЙ (если что-то пошло не так)
-- =====================================================
-- Для отката удалите созданные политики:
/*
DROP POLICY IF EXISTS "admin_stickers_select" ON admin_stickers;
DROP POLICY IF EXISTS "admin_stickers_insert" ON admin_stickers;
DROP POLICY IF EXISTS "admin_stickers_update" ON admin_stickers;
DROP POLICY IF EXISTS "admin_stickers_delete" ON admin_stickers;
DROP POLICY IF EXISTS "profiles_update_secure" ON profiles;
DROP POLICY IF EXISTS "karma_balance_admin_secure" ON karma_balance;
DROP POLICY IF EXISTS "karma_balance_delete_admin" ON karma_balance;
DROP POLICY IF EXISTS "transfers_delete" ON transfers;
DROP POLICY IF EXISTS "karma_transactions_delete" ON karma_transactions;
DROP POLICY IF EXISTS "purchases_delete" ON purchases;
DROP POLICY IF EXISTS "chat_messages_delete" ON chat_messages;
DROP POLICY IF EXISTS "notifications_delete" ON notifications;
DROP POLICY IF EXISTS "task_history_delete" ON task_history;
DROP POLICY IF EXISTS "approval_requests_delete" ON approval_requests;
*/

-- После отката старые политики можно восстановить из бэкапа Supabase
-- или пересоздать через миграции

SELECT '✅ Все SQL-файлы готовы к применению. Начните с Part 1.' as status;
