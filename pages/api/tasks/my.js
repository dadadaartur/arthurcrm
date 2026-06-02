import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // 1. Создаём клиент с сервисным ключом (имеет доступ ко всему)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 2. Определяем пользователя по кукам (как в обычном supabase.auth.getUser)
  // Передаём куки из запроса, чтобы Supabase мог прочитать сессию
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
    req.headers.cookie
  )

  if (userError || !user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  // 3. Получаем назначения для этого пользователя
  const { data: assignments, error: assignError } = await supabaseAdmin
    .from('task_assignments')
    .select('id, status, started_at, deadline_at, task_id')
    .eq('user_id', user.id)
    .in('status', ['assigned', 'in_progress', 'pending_review'])
    .order('created_at', { ascending: false })
    .limit(5)

  if (assignError) {
    return res.status(500).json({ error: assignError.message })
  }

  if (!assignments || assignments.length === 0) {
    return res.status(200).json([])
  }

  // 4. Получаем сами задания по ID
  const taskIds = assignments.map(a => a.task_id)
  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from('tasks')
    .select('id, title, description, reward_karma, task_type, deadline_hours, requires_review')
    .in('id', taskIds)

  if (tasksError) {
    return res.status(500).json({ error: tasksError.message })
  }

  // 5. Объединяем назначения с заданиями
  const merged = assignments.map(assign => ({
    ...assign,
    tasks: tasks.find(t => t.id === assign.task_id) || null
  }))

  res.status(200).json(merged)
}
