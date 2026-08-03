import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // 1. Получаем токен из заголовка
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Нет токена' })
  }
  const token = authHeader.split(' ')[1]

  // 2. Проверяем токен и получаем пользователя (используем анонимный ключ)
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

  if (userError || !user) {
    return res.status(401).json({ error: 'Токен недействителен' })
  }

  // 3. Получаем задания с помощью сервисного ключа (чтобы обойти RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: assignments, error: assignError } = await supabaseAdmin
    .from('task_assignments')
    .select('id, status, started_at, deadline_at, task_id')
    .eq('user_id', user.id)
    .in('status', ['assigned', 'in_progress', 'pending_review'])
    .limit(5)

  if (assignError) return res.status(500).json({ error: assignError.message })
  if (!assignments?.length) return res.status(200).json([])

  const taskIds = [...new Set(assignments.map(a => a.task_id))]
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, description, reward_karma, task_type, deadline_hours, requires_review')
    .in('id', taskIds)

  const merged = assignments.map(a => ({
    ...a,
    tasks: tasks?.find(t => t.id === a.task_id) || null
  }))

  res.status(200).json(merged)
}
