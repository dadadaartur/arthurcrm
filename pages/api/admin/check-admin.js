import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  // Получаем куки из запроса
  const rawCookie = req.headers.cookie || ''
  const cookies = Object.fromEntries(rawCookie.split('; ').map(c => {
    const idx = c.indexOf('=');
    return idx === -1 ? [c.trim(), ''] : [c.substring(0, idx).trim(), decodeURIComponent(c.substring(idx + 1))]
  }))
  const authKey = Object.keys(cookies).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!authKey) return res.status(401).json({ error: 'Нет авторизации' })

  let accessToken
  try {
    const parsed = JSON.parse(cookies[authKey])
    accessToken = parsed.access_token
  } catch (e) {
    return res.status(401).json({ error: 'Невалидный токен' })
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken)
  if (userError || !user) return res.status(401).json({ error: 'Пользователь не найден' })

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('company_id, role_id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile || (profile.role_id !== 1 && profile.role_id !== 2)) {
    return res.status(403).json({ error: 'Не администратор' })
  }

  return res.status(200).json({ profile })
}
