import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAuth(req, res, { allowedRoles: [1, 2] })
  if (!auth) return

  const { taskId } = req.body
  if (!taskId) return res.status(400).json({ error: 'taskId required' })

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Удаляем все назначения, связанные с заданием
  const { error: deleteAssignmentsError } = await serviceClient
    .from('task_assignments')
    .delete()
    .eq('task_id', taskId)

  if (deleteAssignmentsError) {
    console.error('Ошибка удаления назначений:', deleteAssignmentsError)
    return res.status(500).json({ error: 'Не удалось удалить назначения' })
  }

  // Удаляем само задание
  const { error: deleteTaskError } = await serviceClient
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (deleteTaskError) {
    console.error('Ошибка удаления задания:', deleteTaskError)
    return res.status(500).json({ error: 'Не удалось удалить задание' })
  }

  return res.status(200).json({ success: true })
}
