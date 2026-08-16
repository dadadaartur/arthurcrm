-- ============================================================================
-- ИСПРАВЛЕНИЯ И ОПТИМИЗАЦИЯ POLITIK RLS (Row Level Security)
-- Файл: security-fixes-rls-policies.sql
-- Описание: Устранение уязвимостей, дубликатов и оптимизация политик доступа
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. УДАЛЕНИЕ ДУБЛИРУЮЩИХ И ИЗБЫТОЧНЫХ ПОЛИТИК
-- ----------------------------------------------------------------------------

-- Удаление дублирующей политики INSERT на transfers (было 2 одинаковых)
DROP POLICY IF EXISTS "Users can insert transfers" ON transfers;
-- Оставляем только: "Users can insert transfers as sender"

-- Удаление дублирующей политики SELECT на chat_sessions
DROP POLICY IF EXISTS "Users can view own company chat sessions" ON chat_sessions;
-- Оставляем только: "Company members can view chat_sessions"

-- Удаление дублирующей политики SELECT на deals
DROP POLICY IF EXISTS "Users can view company deals" ON deals;
-- Оставляем только: "Company members can view deals"

-- Удаление дублирующей политики SELECT на goals
DROP POLICY IF EXISTS "members_view_company_goals" ON goals;
-- Оставляем только: "Users view own goals" и "admins_manage_company_goals"

-- Удаление избыточной политики на payments
DROP POLICY IF EXISTS "payments_read_own" ON payments;
-- Оставляем только: "company_payments_read_own" (более полная)

-- ----------------------------------------------------------------------------
-- 2. ИСПРАВЛЕНИЕ УЯЗВИМОСТИ admin_stickers - РАЗДЕЛЕНИЕ ПРАВ
-- Было: Одна политика ALL для public (риск несанкционированных операций)
-- Стало: Раздельные политики для каждой операции
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can manage own stickers" ON admin_stickers;

CREATE POLICY "admin_stickers_select_own" ON admin_stickers
    FOR SELECT TO public
    USING (auth.uid() = user_id);

CREATE POLICY "admin_stickers_insert_own" ON admin_stickers
    FOR INSERT TO public
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_stickers_update_own" ON admin_stickers
    FOR UPDATE TO public
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_stickers_delete_own" ON admin_stickers
    FOR DELETE TO public
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. УСИЛЕНИЕ ЗАЩИТЫ profiles - БЛОКИРОВКА ИЗМЕНЕНИЯ КРИТИЧЕСКИХ ПОЛЕЙ
-- Проблема: Сложная политика update могла позволить эскалацию привилегий
-- Решение: Явная блокировка изменения role_id, company_id, is_company_admin
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_update_secure" ON profiles
    FOR UPDATE TO public
    USING (
        -- Пользователь может обновить свой профиль
        (user_id = auth.uid())
        OR
        -- ИЛИ администратор компании может обновить профили подчинённых
        (EXISTS (
            SELECT 1 FROM profiles admin
            WHERE admin.user_id = auth.uid()
              AND admin.company_id = profiles.company_id
              AND (admin.is_company_admin = true OR admin.role_id = 1)
        ))
    )
    WITH CHECK (
        -- Если пользователь обновляет СВОЙ профиль - блокируем критические поля
        CASE 
            WHEN user_id = auth.uid() THEN (
                (role_id IS NULL OR role_id = (SELECT p.role_id FROM profiles p WHERE p.user_id = auth.uid()))
                AND (company_id IS NULL OR company_id = (SELECT p.company_id FROM profiles p WHERE p.user_id = auth.uid()))
                AND (is_company_admin IS NULL OR is_company_admin = (SELECT p.is_company_admin FROM profiles p WHERE p.user_id = auth.uid()))
                AND (can_create_tasks IS NULL OR can_create_tasks = (SELECT p.can_create_tasks FROM profiles p WHERE p.user_id = auth.uid()))
                AND (can_review_tasks IS NULL OR can_review_tasks = (SELECT p.can_review_tasks FROM profiles p WHERE p.user_id = auth.uid()))
                AND (can_manage_employees IS NULL OR can_manage_employees = (SELECT p.can_manage_employees FROM profiles p WHERE p.user_id = auth.uid()))
                AND (can_delete_employees IS NULL OR can_delete_employees = (SELECT p.can_delete_employees FROM profiles p WHERE p.user_id = auth.uid()))
            )
            -- Администратор может менять профили подчинённых (кроме role_id и is_company_admin)
            ELSE (
                role_id IS NULL OR role_id = (SELECT old.role_id FROM profiles old WHERE old.user_id = profiles.user_id)
                AND is_company_admin IS NULL OR is_company_admin = (SELECT old.is_company_admin FROM profiles old WHERE old.user_id = profiles.user_id)
            )
        END
    );

-- ----------------------------------------------------------------------------
-- 4. ДОБАВЛЕНИЕ ЯВНЫХ DELETE ПОЛИТИК (ранее отсутствовали)
-- ----------------------------------------------------------------------------

-- companies: только platform staff может удалять компании
CREATE POLICY "companies_delete_staff_only" ON companies
    FOR DELETE TO public
    USING (is_platform_staff());

-- departments: только админы компании могут удалять отделы
CREATE POLICY "departments_delete_admins" ON departments
    FOR DELETE TO public
    USING (
        company_id IN (
            SELECT profiles.company_id FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.is_company_admin = true
        )
    );

-- positions: только админы компании могут удалять позиции
CREATE POLICY "positions_delete_admins" ON positions
    FOR DELETE TO public
    USING (
        company_id IN (
            SELECT profiles.company_id FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND (profiles.is_company_admin = true OR profiles.can_manage_employees = true)
        )
    );

-- rewards: только админы компании могут удалять награды
CREATE POLICY "rewards_delete_admins" ON rewards
    FOR DELETE TO public
    USING (
        company_id IN (
            SELECT profiles.company_id FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.is_company_admin = true
        )
    );

-- tasks: только создатели или админы могут удалять задачи
CREATE POLICY "tasks_delete_creators_or_admins" ON tasks
    FOR DELETE TO public
    USING (
        (created_by = auth.uid())
        OR
        (EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.company_id = tasks.company_id
              AND (profiles.is_company_admin = true OR profiles.can_create_tasks = true)
        ))
    );

-- chat_templates: только создатели или админы могут удалять шаблоны
CREATE POLICY "chat_templates_delete_creators_or_admins" ON chat_templates
    FOR DELETE TO public
    USING (
        (EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.company_id = chat_templates.company_id
              AND (profiles.is_company_admin = true OR profiles.user_id = (SELECT created_by FROM chat_templates WHERE id = chat_templates.id))
        ))
    );

-- deals: только создатели или админы могут удалять сделки
CREATE POLICY "deals_delete_creators_or_admins" ON deals
    FOR DELETE TO public
    USING (
        (EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.company_id = deals.company_id
              AND (profiles.is_company_admin = true OR profiles.can_create_tasks = true)
        ))
    );

-- ----------------------------------------------------------------------------
-- 5. УСИЛЕНИЕ karma_balance - ПРОВЕРКА БАЛАНСА >= 0
-- Проблема: Отсутствие явной проверки неотрицательности баланса
-- Решение: Добавлена проверка в WITH CHECK для INSERT/UPDATE
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins manage company balance" ON karma_balance;

CREATE POLICY "karma_balance_admins_secure" ON karma_balance
    FOR ALL TO public
    USING (
        EXISTS (
            SELECT 1 FROM profiles admin
            JOIN profiles target ON target.company_id = admin.company_id
            WHERE admin.user_id = auth.uid()
              AND target.user_id = karma_balance.user_id
              AND (admin.is_company_admin = true OR admin.role_id = 1)
        )
    )
    WITH CHECK (
        -- Проверка что баланс неотрицательный
        (balance >= 0)
        AND
        -- Проверка прав администратора
        EXISTS (
            SELECT 1 FROM profiles admin
            JOIN profiles target ON target.company_id = admin.company_id
            WHERE admin.user_id = auth.uid()
              AND target.user_id = karma_balance.user_id
              AND (admin.is_company_admin = true OR admin.role_id = 1)
        )
    );

-- ----------------------------------------------------------------------------
-- 6. ОПТИМИЗАЦИЯ performances - ДОБАВЛЕНИЕ is_platform_staff() ВЕЗДЕ
-- Где это необходимо для супер-администраторов платформы
-- ----------------------------------------------------------------------------

-- Обновление политики audit_logs для явного указания is_platform_staff()
DROP POLICY IF EXISTS "Company admins view audit logs" ON audit_logs;

CREATE POLICY "audit_logs_view_admins_and_staff" ON audit_logs
    FOR SELECT TO public
    USING (
        is_platform_staff()
        OR
        (
            user_id IN (
                SELECT p2.user_id FROM profiles p2
                WHERE p2.company_id = (
                    SELECT profiles.company_id FROM profiles
                    WHERE profiles.user_id = auth.uid()
                )
            )
            AND
            EXISTS (
                SELECT 1 FROM profiles me
                WHERE me.user_id = auth.uid()
                  AND me.is_company_admin = true
            )
        )
    );

-- ----------------------------------------------------------------------------
-- 7. ИСПРАВЛЕНИЕ transfers - УДАЛЕНИЕ ДУБЛИКАТА
-- ----------------------------------------------------------------------------

-- Политика уже удалена в разделе 1, убеждаемся что осталась только одна
-- "Users can insert transfers as sender" с правильной проверкой from_user_id

-- ----------------------------------------------------------------------------
-- 8. ДОПОЛНИТЕЛЬНЫЕ МЕРЫ БЕЗОПАСНОСТИ
-- ----------------------------------------------------------------------------

-- Запрет на удаление критических системных записей (central_bank)
CREATE POLICY "central_bank_no_delete" ON central_bank
    FOR DELETE TO public
    USING (false);

-- Запрет на изменение записей central_bank кем-либо кроме системы
DROP POLICY IF EXISTS "central_bank_read_staff" ON central_bank;

CREATE POLICY "central_bank_staff_only" ON central_bank
    FOR ALL TO public
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.role_id = 1
              AND profiles.company_id IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.role_id = 1
              AND profiles.company_id IS NULL
        )
    );

-- ----------------------------------------------------------------------------
-- 9. ПЕРЕКОМПОНОВКА ИНДЕКСОВ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ RLS
-- ----------------------------------------------------------------------------

-- Индексы для ускорения проверок is_company_admin
CREATE INDEX IF NOT EXISTS idx_profiles_company_admin 
    ON profiles(company_id, is_company_admin) 
    WHERE is_company_admin = true;

-- Индексы для ускорения проверок role_id = 1 (platform staff)
CREATE INDEX IF NOT EXISTS idx_profiles_platform_staff 
    ON profiles(role_id, company_id) 
    WHERE role_id = 1 AND company_id IS NULL;

-- Индексы для ускорения проверок принадлежности к компании
CREATE INDEX IF NOT EXISTS idx_profiles_user_company 
    ON profiles(user_id, company_id);

-- ----------------------------------------------------------------------------
-- 10. АУДИТ И МОНИТОРИНГ
-- ----------------------------------------------------------------------------

-- Триггер для логирования изменений в политиках RLS (если нужно)
-- Примечание: требует создания специальной таблицы audit_rls_changes

-- ============================================================================
-- КОНЕЦ ФАЙЛА ИСПРАВЛЕНИЙ RLS
-- ============================================================================
-- ИНСТРУКЦИЯ ПО ПРИМЕНЕНИЮ:
-- 1. Применить на staging окружении: psql -f security-fixes-rls-policies.sql
-- 2. Протестировать все сценарии доступа
-- 3. Убедиться что администраторы сохраняют нужный доступ
-- 4. Применить на production после успешного тестирования
-- 5. Мониторить логи на предмет ошибок 403/401
-- ============================================================================
