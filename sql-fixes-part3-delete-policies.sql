-- ЧАСТЬ 3/4: Явные DELETE политики для остальных таблиц
-- Выполните после Части 2

-- 1. transfers - DELETE только для админов или отправителя
CREATE POLICY "transfers_delete" ON transfers
    FOR DELETE TO public
    USING (
        from_user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND is_company_admin = true
            AND company_id = (SELECT company_id FROM profiles WHERE user_id = transfers.from_user_id)
        )
        OR is_platform_staff()
    );

-- 2. karma_transactions - DELETE только для админов
CREATE POLICY "karma_transactions_delete" ON karma_transactions
    FOR DELETE TO public
    USING (
        EXISTS (
            SELECT 1 FROM profiles admin
            JOIN profiles target ON target.company_id = admin.company_id
            WHERE admin.user_id = auth.uid()
            AND target.user_id = karma_transactions.user_id
            AND (admin.is_company_admin = true OR admin.role_id = 1)
        )
        OR is_platform_staff()
    );

-- 3. purchases - DELETE для админов или владельца
CREATE POLICY "purchases_delete" ON purchases
    FOR DELETE TO public
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles admin
            JOIN profiles buyer ON buyer.company_id = admin.company_id
            WHERE admin.user_id = auth.uid()
            AND buyer.user_id = purchases.user_id
            AND (admin.is_company_admin = true OR admin.can_review_tasks = true OR admin.role_id = 1)
        )
        OR is_platform_staff()
    );

-- 4. chat_messages - DELETE для автора или оператора сессии
CREATE POLICY "chat_messages_delete" ON chat_messages
    FOR DELETE TO public
    USING (
        sender_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND (chat_sessions.operator_id = auth.uid() OR chat_sessions.client_id = auth.uid())
        )
        OR is_platform_staff()
    );

-- 5. notifications - DELETE для владельца
CREATE POLICY "notifications_delete" ON notifications
    FOR DELETE TO public
    USING (user_id = auth.uid() OR is_platform_staff());

-- 6. task_history - DELETE для владельца или админа
CREATE POLICY "task_history_delete" ON task_history
    FOR DELETE TO public
    USING (
        user_id = auth.uid()
        OR is_platform_staff()
        OR EXISTS (
            SELECT 1 FROM profiles me
            WHERE me.user_id = auth.uid()
            AND (me.is_company_admin = true OR me.can_review_tasks = true)
            AND me.company_id = (SELECT company_id FROM profiles WHERE user_id = task_history.user_id)
        )
    );

-- 7. approval_requests - DELETE для инициатора или админа
CREATE POLICY "approval_requests_delete" ON approval_requests
    FOR DELETE TO public
    USING (
        initiator_id = auth.uid()
        OR approver_id = auth.uid()
        OR is_platform_staff()
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND is_company_admin = true
            AND company_id = (SELECT company_id FROM profiles WHERE user_id = approval_requests.initiator_id)
        )
    );
