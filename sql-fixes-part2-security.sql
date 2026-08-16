-- ЧАСТЬ 2/4: Усиление безопасности и проверка баланса
-- Выполните после Части 1

-- 1. Усилить защиту profiles UPDATE - запретить изменение критических полей обычными пользователями
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_update_secure" ON profiles
    FOR UPDATE TO public
    USING (
        -- Пользователь может обновлять свой профиль
        user_id = auth.uid()
        OR 
        -- Администратор компании может обновлять профили в своей компании
        EXISTS (
            SELECT 1 FROM profiles admin
            WHERE admin.user_id = auth.uid()
            AND admin.company_id = profiles.company_id
            AND (admin.is_company_admin = true OR admin.role_id = 1)
        )
    )
    WITH CHECK (
        -- Если обновляет сам пользователь - он не может менять критические поля
        CASE 
            WHEN user_id = auth.uid() THEN
                role_id IS NOT DISTINCT FROM (SELECT role_id FROM profiles WHERE user_id = auth.uid())
                AND company_id IS NOT DISTINCT FROM (SELECT company_id FROM profiles WHERE user_id = auth.uid())
                AND is_company_admin IS NOT DISTINCT FROM (SELECT is_company_admin FROM profiles WHERE user_id = auth.uid())
                AND can_create_tasks IS NOT DISTINCT FROM (SELECT can_create_tasks FROM profiles WHERE user_id = auth.uid())
                AND can_review_tasks IS NOT DISTINCT FROM (SELECT can_review_tasks FROM profiles WHERE user_id = auth.uid())
                AND can_manage_employees IS NOT DISTINCT FROM (SELECT can_manage_employees FROM profiles WHERE user_id = auth.uid())
                AND can_delete_employees IS NOT DISTINCT FROM (SELECT can_delete_employees FROM profiles WHERE user_id = auth.uid())
            ELSE TRUE
        END
        OR 
        -- Администратор может менять эти поля
        EXISTS (
            SELECT 1 FROM profiles admin
            WHERE admin.user_id = auth.uid()
            AND admin.company_id = profiles.company_id
            AND (admin.is_company_admin = true OR admin.role_id = 1)
        )
    );

-- 2. Добавить проверку неотрицательного баланса для karma_balance
DROP POLICY IF EXISTS "Admins manage company balance" ON karma_balance;

CREATE POLICY "karma_balance_admin_secure" ON karma_balance
    FOR ALL TO public
    USING (
        EXISTS (
            SELECT 1 FROM profiles admin
            JOIN profiles target ON target.company_id = admin.company_id
            WHERE admin.user_id = auth.uid()
            AND target.user_id = karma_balance.user_id
            AND (admin.is_company_admin = true OR admin.role_id = 1)
            -- Проверка что баланс не уйдет в минус
            AND (balance >= 0 OR (balance + COALESCE((SELECT amount FROM karma_transactions ORDER BY created_at DESC LIMIT 1), 0)) >= 0)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles admin
            JOIN profiles target ON target.company_id = admin.company_id
            WHERE admin.user_id = auth.uid()
            AND target.user_id = karma_balance.user_id
            AND (admin.is_company_admin = true OR admin.role_id = 1)
        )
        AND balance >= 0
    );

-- 3. Добавить политику DELETE для karma_balance (только админы)
CREATE POLICY "karma_balance_delete_admin" ON karma_balance
    FOR DELETE TO public
    USING (
        EXISTS (
            SELECT 1 FROM profiles admin
            WHERE admin.user_id = auth.uid()
            AND admin.company_id = (SELECT company_id FROM profiles WHERE user_id = karma_balance.user_id)
            AND (admin.is_company_admin = true OR admin.role_id = 1)
        )
    );
