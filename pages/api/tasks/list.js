import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAuth(req, res)
  if (!auth) return

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const { data: assignments, error } = await supabase
    .from('task_assignments')
    .select('id, status, started_at, deadline_at, tasks ( id, title, description, reward_karma, task_type, deadline_hours, requires_review )')
    .eq('user_id', auth.user.id)
    .in('status', ['assigned', 'in_progress', 'pending_review'])
    .order('created_at', { ascending: false })
    .limit(3)

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json(assignments)
}
