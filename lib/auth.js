import { createClient } from '@supabase/supabase-js'

export async function requireAuth(req, res, options = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: 'Server configuration error' })
    return null
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Разбираем куки
  const cookieHeader = req.headers.cookie || ''
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const [key, ...val] = c.split('=')
      return [key, decodeURIComponent(val.join('='))]
    })
  )

  // Ищем ключ Supabase-сессии
  const authKey = Object.keys(cookies).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!authKey) {
    res.status(401).json({ error: 'Unauthorized: no token in cookies' })
    return null
  }

  let accessToken
  try {
    const parsed = JSON.parse(cookies[authKey])
    accessToken = parsed.access_token
  } catch {
    res.status(401).json({ error: 'Unauthorized: invalid token format' })
    return null
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)
  if (userError || !user) {
    res.status(401).json({ error: 'Unauthorized: invalid token' })
    return null
  }

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
