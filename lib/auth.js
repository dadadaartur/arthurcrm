import { createClient } from '@supabase/supabase-js'

export async function requireAuth(req, res, options = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: 'Server configuration error' })
    return null
  }

  // Создаём клиент, который будет использовать переданные куки
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        // Передаём куки из запроса, чтобы Supabase мог прочитать сессию
        cookie: req.headers.cookie || '',
      },
    },
  })

  // Получаем пользователя из сессии (куки)
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    res.status(401).json({ error: 'Unauthorized: no valid session' })
    return null
  }

  // Получаем профиль пользователя
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, user_id, company_id, role_id, roles(name, is_system)')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    res.status(403).json({ error: 'Forbidden: no profile' })
    return null
  }

  // Проверка ролей, если нужно
  if (options.allowedRoles && !options.allowedRoles.includes(profile.role_id)) {
    res.status(403).json({ error: 'Forbidden: insufficient role' })
    return null
  }

  return { user, profile }
}
