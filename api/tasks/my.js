import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// РАНЬШЕ этот файл не использовал requireAuth и дублировал проверку токена
// вручную — из-за этого выпадала проверка profile.deleted_at, которую
// requireAuth делает обязательной на каждый запрос (см. комментарий в
// lib/auth.js). Итог: уволенный/деактивированный сотрудник продолжал
// видеть список своих заданий через этот конкретный эндпоинт, пока не
// истечёт его JWT. Приведено к единому стандарту.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: assignments, error: assignError } = await supabaseAdmin
    .from('task_assignments')
    .select('id, status, started_at, deadline_at, task_id')
    .eq('user_id', ctx.user.id)
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
