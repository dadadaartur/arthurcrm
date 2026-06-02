import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ error: 'Unauthorized' })
  const token = authHeader.split(' ')[1]

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { data: { user }, error: tokenErr } = await supabaseAdmin.auth.getUser(token)
  if (tokenErr || !user) return res.status(401).json({ error: 'Invalid token' })

  const { assignmentId, comment } = req.body
  const { error: updateErr } = await supabaseAdmin
    .from('task_assignments')
    .update({ status: 'pending_review', comment, completed_at: new Date().toISOString() })
    .eq('id', assignmentId)
    .eq('user_id', user.id)  // только своё

  if (updateErr) return res.status(500).json({ error: updateErr.message })
  res.status(200).json({ success: true })
}
