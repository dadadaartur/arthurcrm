// lib/auth.js
import { createClient } from '@supabase/supabase-js'

/**
 * Проверяет авторизацию пользователя в API-роуте.
 * Работает без @supabase/ssr, парсит куки вручную.
 */
export async function requireAuth(req, res, options = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Создаём обычный клиент
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Достаём JWT из кук (Supabase хранит его в "sb-<project-ref>-auth-token")
  const cookie = req.headers.cookie || ''
  const tokenMatch = cookie.match(/sb-[a-z]+-auth-token=([^;]+)/)
  if (!tokenMatch) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }

  const jwt = tokenMatch[1]

  // Проверяем токен и получаем пользователя
  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)
  if (userError || !user) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }

  // Получаем профиль с ролью
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, user_id, company_id, role_id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    res.status(403).json({ error: 'Forbidden: no profile found' })
    return null
  }

  // Проверка роли
  if (options.allowedRoles && !options.allowedRoles.includes(profile.role_id)) {
    res.status(403).json({ error: 'Forbidden: insufficient role' })
    return null
  }

  return { user, profile }
}
