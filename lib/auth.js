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
 * Используй это внутри других API-роутов (без лишних fetch на себя же).
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

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)
  if (userError || !user) {
    return { error: 'invalid_token', status: 401 }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, user_id, email, company_id, role_id, roles(name, is_system)')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return { error: 'no_profile', status: 403 }
  }

  return { user, profile }
}

/**
 * Требует авторизации, опционально — конкретных ролей.
 * Сама отправляет HTTP-ответ при отказе и возвращает null в этом случае —
 * вызывающий код должен сделать `if (!ctx) return`.
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

  return ctx
}

/** Роли верхнего уровня — держим в одном месте вместо магических чисел по всему коду */
export const ROLES = {
  SUPER_ADMIN: 1,
  COMPANY_ADMIN: 2,
}

export const ADMIN_ROLE_IDS = [ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN]
