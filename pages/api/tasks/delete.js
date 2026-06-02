import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  const token = authHeader.split(' ')[1]

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user: adminUser }, error: tokenError } = await supabaseAdmin.auth.getUser(token)
  if (tokenError || !adminUser) return res.status(401).json({ error: 'Invalid token' })

  const { taskId } = req.body
  if (!taskId) return res.status(400).json({ error: 'taskId required' })

  // Проверяем, что админ имеет право удалять задание своей компании
  const { data: adminProfile } = await supabaseAdmin
    .from('profiles')
    .select('company_id, role_id')
    .eq('user_id', adminUser.id)
    .single()

  if (!adminProfile || (adminProfile.role_id !== 1 && adminProfile.role_id !== 2)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // Удаляем назначения, затем задание
  await supabaseAdmin.from('task_assignments').delete().eq('task_id', taskId)
  const { error: deleteError } = await supabaseAdmin.from('tasks').delete().eq('id', taskId)
  if (deleteError) return res.status(500).json({ error: deleteError.message })

  return res.status(200).json({ success: true })
}
