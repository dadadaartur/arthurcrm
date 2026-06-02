import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  // Извлекаем токен из заголовка Authorization
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = authHeader.split(' ')[1]

  // Сервисный клиент для проверки токена и запросов к базе
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Проверяем токен и получаем пользователя
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Получаем назначения для этого пользователя
  const { data: assignments, error: assignError } = await supabaseAdmin
    .from('task_assignments')
    .select('id, status, started_at, deadline_at, task_id')
    .eq('user_id', user.id)
    .in('status', ['assigned', 'in_progress', 'pending_review'])
    .order('created_at', { ascending: false })
    .limit(5)

  if (assignError) return res.status(500).json({ error: assignError.message })
  if (!assignments || assignments.length === 0) return res.status(200).json([])

  // Загружаем задачи
  const taskIds = [...new Set(assignments.map(a => a.task_id))]
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, description, reward_karma, task_type, deadline_hours, requires_review')
    .in('id', taskIds)

  // Объединяем
  const merged = assignments.map(a => ({
    ...a,
    tasks: tasks?.find(t => t.id === a.task_id) || null
  }))

  res.status(200).json(merged)
}
