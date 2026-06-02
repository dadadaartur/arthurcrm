import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = authHeader.split(' ')[1]

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !user) return res.status(401).json({ error: 'Invalid token' })

  const { assignmentId } = req.body
  const { error } = await supabaseAdmin
    .from('task_assignments')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', assignmentId)
    .eq('user_id', user.id) // безопасность: только своё

  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ success: true })
}
