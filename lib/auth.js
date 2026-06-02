import { createClient } from '@supabase/supabase-js'

export async function requireAuth(req, res, options = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: 'Server configuration error' })
    return null
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Получаем сырой заголовок cookie
  const rawCookie = req.headers.cookie || ''

  // Функция для ответа с отладкой
  function debugError(msg) {
    res.status(401).json({
      error: msg,
      debug: {
        cookieHeader: rawCookie.substring(0, 200), // первые 200 символов, чтобы не раскрыть весь токен
        cookieKeys: Object.keys(
          Object.fromEntries(
            rawCookie.split('; ').map(c => {
              const [key] = c.split('=')
              return [key, '']
            })
          )
        )
      }
    })
    return null
  }

  if (!rawCookie) {
    return debugError('No cookie header at all')
  }

  // Разбираем куки в объект
  const cookies = Object.fromEntries(
    rawCookie.split('; ').map(c => {
      const equalIndex = c.indexOf('=')
      if (equalIndex === -1) return [c.trim(), '']
      const key = c.substring(0, equalIndex).trim()
      const value = c.substring(equalIndex + 1)
      return [key, decodeURIComponent(value)]
    })
  )

  // Ищем ключ Supabase-сессии
  const authKey = Object.keys(cookies).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))

  if (!authKey) {
    return debugError('No supabase auth cookie found')
  }

  let accessToken
  try {
    const parsed = JSON.parse(cookies[authKey])
    if (!parsed.access_token) {
      return debugError('Auth cookie does not contain access_token')
    }
    accessToken = parsed.access_token
  } catch (e) {
    return debugError('Failed to parse auth cookie JSON')
  }

  // Проверяем токен
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)
  if (userError || !user) {
    return debugError('Invalid access token')
  }

  // Получаем профиль
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, user_id, company_id, role_id, roles(name, is_system)')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    res.status(403).json({ error: 'Forbidden: no profile' })
    return null
  }

  if (options.allowedRoles && !options.allowedRoles.includes(profile.role_id)) {
    res.status(403).json({ error: 'Forbidden: insufficient role' })
    return null
  }

  return { user, profile }
}
