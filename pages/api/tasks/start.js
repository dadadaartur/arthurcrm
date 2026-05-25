import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAuth(req, res)
  if (!auth) return

  const { assignmentId } = req.body

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const { data: assignment, error: fetchError } = await supabase
    .from('task_assignments')
    .select('id, status')
    .eq('id', assignmentId)
    .single()

  if (fetchError || assignment.status !== 'assigned') {
    return res.status(400).json({ error: 'Нельзя начать это задание' })
  }

  const { error } = await supabase
    .from('task_assignments')
    .update({ status: 'in_progress', started_at: new Date() })
    .eq('id', assignmentId)

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ success: true })
}
