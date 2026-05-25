// lib/auth.js
import { createClient } from '@supabase/supabase-js'

export async function requireAuth(req, res, options = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Создаём клиент без глобальной сессии — будем передавать токен вручную
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Достаём токен из кук (формат, который использует Supabase)
  const cookie = req.headers.cookie || ''
  const tokenMatch = cookie.match(/sb-[a-z]+-auth-token=([^;]+)/)
  if (!tokenMatch) {
    res.status(401).json({ error: 'Unauthorized: no token in cookies' })
    return null
  }

  const accessToken = tokenMatch[1]

  // Устанавливаем сессию из токена
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)
  if (userError || !user) {
    res.status(401).json({ error: 'Unauthorized: invalid token' })
    return null
  }

  // Получаем профиль
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, user_id, company_id, role_id')
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
