import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAuth(req, res)
  if (!auth) return

  const { assignmentId } = req.body
  if (!assignmentId) return res.status(400).json({ error: 'assignmentId required' })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Проверим, что назначение принадлежит пользователю и статус = 'assigned'
  const { data: assignment, error: fetchError } = await supabase
    .from('task_assignments')
    .select('id, status, user_id')
    .eq('id', assignmentId)
    .single()

  if (fetchError || !assignment) return res.status(404).json({ error: 'Назначение не найдено' })
  if (assignment.user_id !== auth.user.id) return res.status(403).json({ error: 'Не ваше задание' })
  if (assignment.status !== 'assigned') return res.status(400).json({ error: 'Нельзя начать' })

  const { error } = await supabase
    .from('task_assignments')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', assignmentId)

  if (error) return res.status(500).json({ error: error.message })

  res.status(200).json({ success: true })
}
