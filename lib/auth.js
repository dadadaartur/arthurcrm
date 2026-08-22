import { createClient } from '@supabase/supabase-js'

/**
 * Достаёт access_token из запроса: сначала из заголовка Authorization: Bearer,
 * затем из supabase-cookie (sb-*-auth-token).
 */
function extractAccessToken(req) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1]
  }

  const rawCookie = req.headers.cookie || ''
  if (!rawCookie) return null

  const cookies = Object.fromEntries(
    rawCookie.split('; ').map(c => {
      const idx = c.indexOf('=')
      if (idx === -1) return [c.trim(), '']
      return [c.substring(0, idx).trim(), decodeURIComponent(c.substring(idx + 1))]
    })
  )

  const authKey = Object.keys(cookies).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!authKey) return null

  try {
    const parsed = JSON.parse(cookies[authKey])
    return parsed.access_token || null
  } catch (e) {
    return null
  }
}

/**
 * Проверяет пользователя и его профиль по запросу.
 * Не отправляет HTTP-ответ — просто возвращает результат или null.
 */
export async function getAuthContext(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: 'config', status: 500 }
  }

  const accessToken = extractAccessToken(req)
  if (!accessToken) {
    return { error: 'no_token', status: 401 }
  }

  // ВАЖНО: supabase.auth.getUser(accessToken) только ПРОВЕРЯЕТ токен и
  // возвращает данные о пользователе — он НЕ прикрепляет этот токен к
  // клиенту для последующих запросов. Если создать клиент просто через
  // createClient(url, anonKey) и потом вызвать .from('profiles').select(),
  // этот запрос уйдёт от имени анонимной роли (anon), а не от имени
  // пользователя — RLS-политика "auth.uid() = user_id" увидит auth.uid()
  // как null и не найдёт НИ ОДНОЙ строки, даже собственную. Именно это
  // происходило: profiles реально существует, но PostgREST возвращал
  // PGRST116 "The result contains 0 rows" на любом self-select.
  // Исправление — явно прокинуть токен пользователя в заголовок Authorization
  // при создании клиента, тогда PostgREST/RLS видят настоящего auth.uid().
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  })
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)
  if (userError || !user) {
    return { error: 'invalid_token', status: 401 }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      user_id, email, company_id, role_id, display_name, deleted_at,
      is_company_admin, can_create_tasks, can_review_tasks,
      can_manage_employees, can_delete_employees,
      roles(name, is_system)
    `)
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    // Раньше здесь молча возвращался no_profile при ЛЮБОЙ причине сбоя —
    // в том числе если строка реально существует, но запрос упал по
    // другой причине (RLS, неверный ключ, ошибка embed-джойна с roles
    // и т.д.). Это делало отладку невозможной: 403 "no profile" выглядел
    // одинаково что при реальном отсутствии профиля, что при скрытой
    // ошибке БД. Логируем настоящую причину.
    console.error('[auth] не удалось получить профиль', {
      userId: user.id,
      error: profileError ? { message: profileError.message, code: profileError.code, details: profileError.details, hint: profileError.hint } : null
    })
    return { error: 'no_profile', status: 403 }
  }

  // Мягко удалённый сотрудник (уволен/деактивирован через
  // company-admin/employees.js) — для API это то же самое, что и
  // отсутствие профиля. auth.users при soft-delete намеренно не трогаем
  // (чтобы можно было восстановить), поэтому проверка обязательна именно
  // здесь, на каждый запрос — иначе уволенный сотрудник сохраняет доступ
  // ко всем действиям (покупки, задания и т.д.) до истечения JWT.
  if (profile.deleted_at) {
    return { error: 'no_profile', status: 403 }
  }

  return { user, profile }
}

/**
 * Отдельно от getAuthContext: проверяет, состоит ли пользователь в
 * admin_users (платформенный модератор Кармического банка). Не требует
 * profiles-записи — модератор площадки может не быть привязан ни к одной
 * компании. Использует service-role, т.к. читает admin_users не от лица
 * пользователя (RLS там закрыт для обычных клиентов).
 */
export async function getPlatformStaffContext(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
    return { error: 'config', status: 500 }
  }

  const accessToken = extractAccessToken(req)
  if (!accessToken) return { error: 'no_token', status: 401 }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)
  if (userError || !user) return { error: 'invalid_token', status: 401 }

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: profile } = await admin
    .from('profiles')
    .select('role_id, company_id, deleted_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profile && !profile.deleted_at && profile.role_id === ROLES.SUPER_ADMIN && profile.company_id === null) {
    return { user, isSuperAdmin: true, permissions: ['*'] }
  }

  const { data: staff } = await admin
    .from('admin_users')
    .select('permissions, active')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!staff || staff.active !== true) {
    return { error: 'not_platform_staff', status: 403 }
  }

  return { user, isSuperAdmin: false, permissions: staff.permissions || [] }
}

/**
 * Требует, чтобы пользователь был платформенным стаффом (супер-админ
 * Кармического банка либо активная запись в admin_users). Опционально
 * требует конкретное право из admin_users.permissions.
 * Сама отправляет HTTP-ответ при отказе.
 */
export async function requirePlatformStaff(req, res, options = {}) {
  const ctx = await getPlatformStaffContext(req)

  if (ctx.error === 'config') {
    res.status(500).json({ error: 'Server configuration error' })
    return null
  }
  if (ctx.error === 'no_token' || ctx.error === 'invalid_token') {
    res.status(401).json({ error: 'Не авторизован' })
    return null
  }
  if (ctx.error === 'not_platform_staff') {
    res.status(403).json({ error: 'Forbidden: not platform staff' })
    return null
  }

  if (options.permission && !ctx.isSuperAdmin && !ctx.permissions.includes(options.permission)) {
    res.status(403).json({ error: 'Forbidden: insufficient platform permission' })
    return null
  }

  return ctx
}

/** Роли/права Кармического банка:
 *
 *  - Супер-админ (сторона Кармического банка): role_id === ROLES.SUPER_ADMIN.
 *    Единственная глобальная системная роль (company_id = null) — безопасно
 *    хардкодить, в отличие от прочих role_id, которые уникальны для каждой
 *    компании (roles.company_id) и НЕ являются переносимыми константами.
 *
 *  - Админ компании: profiles.is_company_admin === true. Полные права
 *    внутри своей компании, автоматически включает все can_* права.
 *
 *  - Модератор: is_company_admin === false, но у него включены отдельные
 *    флаги (can_manage_employees, can_review_tasks, can_delete_employees,
 *    can_create_tasks) — админ компании включает их вручную, по одному.
 *
 *  - Обычный сотрудник: ни одного из вышеперечисленного.
 */
export const ROLES = {
  SUPER_ADMIN: 1,
}

/**
 * Email основателя платформы — единственная проверка доступа к разделу
 * "Центробанк" (эмиссия, движения, дашборд). Раньше эта строка была
 * захардкожена по отдельности в lib/paymentSettlement.js,
 * pages/api/central-bank/emit.js, movements.js и dashboard.js — четыре
 * места, которые легко рассинхронизировать при смене email. Теперь
 * значение одно, настраивается через .env (FOUNDER_EMAIL), а хардкод
 * ниже — это дефолт на случай, если переменную забыли выставить при
 * деплое (чтобы не потерять доступ к платформе).
 */
export function getFounderEmail() {
  return process.env.FOUNDER_EMAIL || 'arturgalkin.ru@mail.ru'
}

/** Является ли пользователь основателем платформы (см. getFounderEmail). */
export function isFounder(user) {
  return !!user?.email && user.email === getFounderEmail()
}

/**
 * Супер-админ Кармического банка — доступ везде, во всех компаниях.
 * Проверяем ОБА условия (role_id === 1 И company_id === null), а не
 * только role_id — так как это защищённая инвариантом системная роль,
 * а не просто число. Раньше проверялся только role_id, что теоретически
 * могло совпасть с чужим company-specific role_id, если бы когда-то
 * нарушилась последовательность id в таблице roles.
 */
export function isSuperAdmin(profile) {
  return profile?.role_id === ROLES.SUPER_ADMIN && profile?.company_id == null
}

/** Полноправный админ конкретной компании. */
export function isCompanyAdmin(profile) {
  return profile?.is_company_admin === true
}

/**
 * Есть ли у профиля право `permissionFlag` (например 'can_review_tasks').
 * Супер-админ и админ компании имеют его автоматически, без явного флага —
 * модератору право нужно включить отдельно.
 */
export function hasPermission(profile, permissionFlag) {
  if (!profile) return false
  if (isSuperAdmin(profile)) return true
  if (isCompanyAdmin(profile)) return true
  return profile[permissionFlag] === true
}

/**
 * Может ли профиль действовать в отношении ресурса компании `targetCompanyId`.
 * Супер-админ — везде. Остальные — только в своей компании.
 */
export function canAccessCompany(profile, targetCompanyId) {
  if (isSuperAdmin(profile)) return true
  return profile?.company_id != null && profile.company_id === targetCompanyId
}

/**
 * Требует авторизации. Опции:
 *  - allowedRoles: [1] — хардкод конкретных role_id (используйте только для
 *    вещей уровня "только супер-админ Кармического банка", НЕ для прав
 *    внутри компании — там roles per-company и хардкодить id небезопасно).
 *  - permission: 'can_review_tasks' — требует hasPermission(profile, flag)
 *    (супер-админ и админ компании проходят автоматически).
 * Сама отправляет HTTP-ответ при отказе и возвращает null — вызывающий код
 * должен сделать `if (!ctx) return`.
 */
export async function requireAuth(req, res, options = {}) {
  const ctx = await getAuthContext(req)

  if (ctx.error === 'config') {
    res.status(500).json({ error: 'Server configuration error' })
    return null
  }
  if (ctx.error === 'no_token' || ctx.error === 'invalid_token') {
    res.status(401).json({ error: 'Не авторизован' })
    return null
  }
  if (ctx.error === 'no_profile') {
    res.status(403).json({ error: 'Forbidden: no profile' })
    return null
  }

  if (options.allowedRoles && !options.allowedRoles.includes(ctx.profile.role_id)) {
    res.status(403).json({ error: 'Forbidden: insufficient role' })
    return null
  }

  if (options.permission && !hasPermission(ctx.profile, options.permission)) {
    res.status(403).json({ error: 'Forbidden: insufficient permission' })
    return null
  }

  return ctx
}
