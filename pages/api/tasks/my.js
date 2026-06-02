import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Получаем токен из заголовка Authorization
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = authHeader.split(' ')[1]

  // Проверяем токен и получаем пользователя
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Теперь получаем данные (сервисный ключ уже в supabaseAdmin)
  const { data, error } = await supabaseAdmin
    .from('task_assignments')
    .select('id, status, started_at, deadline_at, tasks( id, title, description, reward_karma, task_type, deadline_hours, requires_review )')
    .eq('user_id', user.id)
    .in('status', ['assigned', 'in_progress', 'pending_review'])
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json(data || [])
}
