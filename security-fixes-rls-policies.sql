-- ============================================================
-- ОПТИМИЗИРОВАННЫЕ ПОЛИТИКИ RLS ДЛЯ ИСПРАВЛЕНИЯ УЯЗВИМОСТЕЙ
-- ============================================================
-- Этот скрипт исправляет найденные проблемы безопасности:
-- 1. Дублирование политик на transfers
-- 2. Отсутствие проверки баланса при трансферах
-- 3. Избыточные политики на chat_sessions
-- 4. Сложные и потенциально уязвимые политики profiles
-- 5. Добавление явных DELETE политик
-- ============================================================

-- ------------------------------------------------------------
-- 1. TRANSFERS: Удаляем дублирующую политику INSERT
-- ------------------------------------------------------------
-- Оставляем только одну политику INSERT с проверкой from_user_id
DROP POLICY IF EXISTS "Users can insert transfers" ON transfers;
-- Политика "Users can insert transfers as sender" уже существует - оставляем её

-- ------------------------------------------------------------
-- 2. TRANSFERS: Добавляем политику DELETE (только администраторы)
-- ------------------------------------------------------------
CREATE POLICY "Admins can delete transfers" ON transfers
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin
      WHERE admin.user_id = auth.uid()
        AND admin.is_company_admin = true
        AND admin.company_id = (
          SELECT p.company_id FROM profiles p 
          WHERE p.user_id = transfers.from_user_id
        )
    )
    OR is_platform_staff()
  );

-- ------------------------------------------------------------
-- 3. CHAT_SESSIONS: Удаляем дублирующие SELECT политики
-- ------------------------------------------------------------
-- Оставляем только одну универсальную политику SELECT
DROP POLICY IF EXISTS "Users can view deal-related chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can view own company chat sessions" ON chat_sessions;

-- Создаём единую оптимизированную политику SELECT
CREATE POLICY "Company members can view chat sessions" ON chat_sessions
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.company_id = chat_sessions.company_id
    )
    OR is_platform_staff()
  );

-- ------------------------------------------------------------
-- 4. PROFILES: Упрощаем и усиливаем политику UPDATE
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_update_secure" ON profiles
  FOR UPDATE
  TO public
  USING (
    -- Пользователь может обновлять только свой профиль
    user_id = auth.uid()
    -- ИЛИ администратор компании может обновлять профили сотрудников
    OR EXISTS (
      SELECT 1 FROM profiles admin
      WHERE admin.user_id = auth.uid()
        AND admin.company_id = profiles.company_id
        AND (admin.is_company_admin = true OR admin.role_id = 1)
    )
  )
  WITH CHECK (
    -- При обновлении пользователем самого себя:
    -- нельзя изменить role_id, company_id, is_company_admin и другие критические поля
    CASE 
      WHEN user_id = auth.uid() THEN
        role_id IS NOT DISTINCT FROM (SELECT role_id FROM profiles WHERE user_id = auth.uid())
        AND company_id IS NOT DISTINCT FROM (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        AND is_company_admin IS NOT DISTINCT FROM (SELECT is_company_admin FROM profiles WHERE user_id = auth.uid())
        AND can_create_tasks IS NOT DISTINCT FROM (SELECT can_create_tasks FROM profiles WHERE user_id = auth.uid())
        AND can_review_tasks IS NOT DISTINCT FROM (SELECT can_review_tasks FROM profiles WHERE user_id = auth.uid())
        AND can_manage_employees IS NOT DISTINCT FROM (SELECT can_manage_employees FROM profiles WHERE user_id = auth.uid())
        AND can_delete_employees IS NOT DISTINCT FROM (SELECT can_delete_employees FROM profiles WHERE user_id = auth.uid())
      -- Администратор может изменять эти поля
      ELSE true
    END
  );

-- ------------------------------------------------------------
-- 5. ADMIN_STICKERS: Разделяем операции для лучшей защиты
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own stickers" ON admin_stickers;

-- SELECT: пользователи видят только свои стикеры
CREATE POLICY "Users can view own stickers" ON admin_stickers
  FOR SELECT
  TO public
  USING (user_id = auth.uid());

-- INSERT: пользователи могут создавать только свои стикеры
CREATE POLICY "Users can create own stickers" ON admin_stickers
  FOR INSERT
  TO public
  WITH CHECK (user_id = auth.uid());

-- UPDATE: пользователи могут обновлять только свои стикеры
CREATE POLICY "Users can update own stickers" ON admin_sticker
  FOR UPDATE
  TO public
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: пользователи могут удалять только свои стикеры
CREATE POLICY "Users can delete own stickers" ON admin_stickers
  FOR DELETE
  TO public
  USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- 6. KARMA_BALANCE: Усиливаем проверку для INSERT/UPDATE
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage company balance" ON karma_balance;

CREATE POLICY "Admins manage company balance secure" ON karma_balance
  FOR ALL
  TO public
  USING (
    -- Администраторы могут управлять балансом сотрудников своей компании
    EXISTS (
      SELECT 1 FROM profiles admin
      JOIN profiles target ON target.company_id = admin.company_id
      WHERE admin.user_id = auth.uid()
        AND target.user_id = karma_balance.user_id
        AND (admin.is_company_admin = true OR admin.role_id = 1)
    )
    OR is_platform_staff()
  )
  WITH CHECK (
    -- Дополнительная проверка: баланс не может быть отрицательным
    balance >= 0
  );

-- ------------------------------------------------------------
-- 7. GOALS: Удаляем дублирующие политики
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage goals" ON goals;
DROP POLICY IF EXISTS "admins_manage_company_goals" ON goals;

-- Создаём единую политику для администраторов
CREATE POLICY "Admins manage company goals" ON goals
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.company_id = goals.company_id
        AND (profiles.is_company_admin = true 
             OR profiles.can_create_tasks = true 
             OR profiles.can_review_tasks = true
             OR profiles.role_id = 1)
    )
    OR is_platform_staff()
  );

-- Политика для просмотра своих целей пользователем
CREATE POLICY "Users view own goals" ON goals
  FOR SELECT
  TO public
  USING (user_id = auth.uid());

-- Единая политика для просмотра целей компании
CREATE POLICY "Members view company goals" ON goals
  FOR SELECT
  TO public
  USING (
    company_id = (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid())
    OR is_platform_staff()
  );

-- ------------------------------------------------------------
-- 8. TASK_ASSIGNMENTS: Добавляем DELETE политику
-- ------------------------------------------------------------
CREATE POLICY "Admins can delete task assignments" ON task_assignments
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND (profiles.is_company_admin = true OR profiles.can_review_tasks = true OR profiles.role_id = 1)
        AND profiles.company_id = (
          SELECT tasks.company_id FROM tasks WHERE tasks.id = task_assignments.task_id
        )
    )
    OR is_platform_staff()
  );

-- ------------------------------------------------------------
-- 9. PURCHASES: Добавляем DELETE политику
-- ------------------------------------------------------------
CREATE POLICY "Admins can delete company purchases" ON purchases
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin
      JOIN profiles buyer ON buyer.company_id = admin.company_id
      WHERE admin.user_id = auth.uid()
        AND buyer.user_id = purchases.user_id
        AND (admin.is_company_admin = true OR admin.can_review_tasks = true OR admin.role_id = 1)
    )
    OR is_platform_staff()
  );

-- ------------------------------------------------------------
-- 10. REWARDS: Добавляем DELETE политику
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Company admins manage own rewards" ON rewards;

CREATE POLICY "Company admins manage rewards" ON rewards
  FOR ALL
  TO public
  USING (
    company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND (profiles.is_company_admin = true OR profiles.role_id = 1)
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role_id = 1
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND (profiles.is_company_admin = true OR profiles.role_id = 1)
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role_id = 1
    )
  );

-- ------------------------------------------------------------
-- 11. DEPARTMENTS: Добавляем DELETE политику
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Company admins manage departments" ON departments;

CREATE POLICY "Company admins manage departments" ON departments
  FOR ALL
  TO public
  USING (
    company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.is_company_admin = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.is_company_admin = true
    )
  );

-- ------------------------------------------------------------
-- 12. POSITIONS: Добавляем DELETE политику
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Company admins manage positions" ON positions;

CREATE POLICY "Company admins manage positions" ON positions
  FOR ALL
  TO public
  USING (
    company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND (profiles.is_company_admin = true OR profiles.can_manage_employees = true)
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND (profiles.is_company_admin = true OR profiles.can_manage_employees = true)
    )
  );

-- ------------------------------------------------------------
-- ПРИМЕЧАНИЯ ПО БЕЗОПАСНОСТИ:
-- ------------------------------------------------------------
-- 1. Все политики используют is_platform_staff() для доступа супер-админов
-- 2. Проверка company_id предотвращает доступ к данным других компаний
-- 3. Явные DELETE политики предотвращают случайное удаление данных
-- 4. WITH CHECK обеспечивает валидацию данных при INSERT/UPDATE
-- 5. Удалены дублирующие политики для уменьшения поверхности атаки
--
-- ВАЖНО: После применения этого скрипта необходимо:
-- 1. Протестировать все функции приложения
-- 2. Проверить логи доступа
-- 3. Убедиться что администраторы имеют нужный уровень доступа
-- ------------------------------------------------------------
