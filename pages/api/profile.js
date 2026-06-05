import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Получаем сессию из кук
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  // Используем сервисный ключ для обхода RLS
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'Service key missing' })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('display_name, role_id, company_id, avatar_url, first_name, last_name')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (profileError) {
    return res.status(500).json({ error: 'Failed to load profile' })
  }

  res.status(200).json(profile || null)
}
