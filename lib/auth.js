import { createClient } from '@supabase/supabase-js'

export async function requireAuth(req, res, options = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: 'Server configuration error' })
    return null
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Разбираем все куки в объект
  const cookieString = req.headers.cookie || ''
  const cookies = Object.fromEntries(
    cookieString.split('; ').map(c => {
      const [key, ...val] = c.split('=')
      return [key, decodeURIComponent(val.join('='))]
    })
  )

  // Ищем куку, которая начинается с 'sb-' и заканчивается на '-auth-token'
  const authCookieKey = Object.keys(cookies).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!authCookieKey) {
    res.status(401).json({ error: 'Unauthorized: no token in cookies' })
    return null
  }

  let accessToken
  try {
    const parsed = JSON.parse(cookies[authCookieKey])
    accessToken = parsed.access_token
  } catch {
    res.status(401).json({ error: 'Unauthorized: invalid token format' })
    return null
  }

  // Проверяем токен и получаем пользователя
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)
  if (userError || !user) {
    res.status(401).json({ error: 'Unauthorized: invalid token' })
    return null
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
