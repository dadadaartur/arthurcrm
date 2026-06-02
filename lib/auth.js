import { createClient } from '@supabase/supabase-js'

function parseSupabaseCookies(cookieHeader) {
  // Ищем все куки, начинающиеся с sb- и заканчивающиеся на -auth-token
  const authCookies = cookieHeader?.split(';').map(c => c.trim()).filter(c => c.startsWith('sb-') && c.endsWith('-auth-token'))
  if (!authCookies || authCookies.length === 0) return null

  // Берём первую подходящую (обычно одна)
  const rawCookie = authCookies[0]
  const value = rawCookie.split('=')[1]
  if (!value) return null

  try {
    // Значение куки — это JSON с access_token и refresh_token
    const parsed = JSON.parse(decodeURIComponent(value))
    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
    }
  } catch (e) {
    return null
  }
}

export async function requireAuth(req, res, options = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: 'Server configuration error' })
    return null
  }

  // Создаём клиент без автоматической работы с куками
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  // Парсим куки из запроса
  const tokens = parseSupabaseCookies(req.headers.cookie)

  if (!tokens) {
    res.status(401).json({ error: 'Unauthorized: no token in cookies' })
    return null
  }

  // Устанавливаем сессию из токенов
  const { data: { user }, error: sessionError } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })

  if (sessionError || !user) {
    res.status(401).json({ error: 'Unauthorized: invalid session' })
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

  // Проверка ролей
  if (options.allowedRoles && !options.allowedRoles.includes(profile.role_id)) {
    res.status(403).json({ error: 'Forbidden: insufficient role' })
    return null
  }

  return { user, profile }
}
