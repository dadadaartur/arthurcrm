import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAuth(req, res, { allowedRoles: [1, 2] })
  if (!auth) return

  const { taskId } = req.body
  if (!taskId) return res.status(400).json({ error: 'taskId required' })

  // Используем сервисный клиент для удаления (чтобы обойти RLS, если есть)
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { error } = await serviceClient
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ success: true })
}
