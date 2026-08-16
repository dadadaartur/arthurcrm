-- ЧАСТЬ 1/4: Исправление дубликатов и опечаток
-- Выполните этот скрипт первым

-- 1. Удалить дублирующую политику на transfers (оставляем только одну "Users can insert transfers as sender")
DROP POLICY IF EXISTS "Users can insert transfers" ON transfers;

-- 2. Удалить дублирующую политику на chat_sessions (оставляем "Users can view own company chat sessions")
DROP POLICY IF EXISTS "Users can view deal-related chat sessions" ON chat_sessions;

-- 3. Удалить дублирующую политику на goals (оставляем admins_manage_company_goals)
DROP POLICY IF EXISTS "Admins manage goals" ON goals;
DROP POLICY IF EXISTS "Users view own goals" ON goals;

-- 4. Исправить опечатку в admin_stickers (если была создана неправильная политика)
DROP POLICY IF EXISTS "Users can manage own stickers" ON admin_stickers;
DROP POLICY IF EXISTS "Users can manage own sticker" ON admin_sticker; -- на случай если создалась с ошибкой

-- 5. Создать корректные разделенные политики для admin_stickers
CREATE POLICY "admin_stickers_select" ON admin_stickers
    FOR SELECT TO public
    USING (auth.uid() = user_id);

CREATE POLICY "admin_stickers_insert" ON admin_stickers
    FOR INSERT TO public
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_stickers_update" ON admin_stickers
    FOR UPDATE TO public
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_stickers_delete" ON admin_stickers
    FOR DELETE TO public
    USING (auth.uid() = user_id);
