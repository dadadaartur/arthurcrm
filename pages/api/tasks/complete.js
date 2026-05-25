import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAuth(req, res)
  if (!auth) return

  const { assignmentId, comment } = req.body

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const { data: assignment, error: fetchError } = await supabase
    .from('task_assignments')
    .select('id, status')
    .eq('id', assignmentId)
    .single()

  if (fetchError || assignment.status !== 'in_progress') {
    return res.status(400).json({ error: 'Задание не может быть завершено' })
  }

  const newStatus = assignment.requires_review ? 'pending_review' : 'completed'

  const { error } = await supabase
    .from('task_assignments')
    .update({ status: newStatus, completed_at: new Date(), comment })
    .eq('id', assignmentId)

  if (error) return res.status(500).json({ error: error.message })

  if (newStatus === 'completed') {
    // Начисление кармиков (используем service_role для обхода RLS)
    const serviceClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    await serviceClient
      .from('karma_transactions')
      .insert({
        user_id: assignment.user_id,
        amount: assignment.tasks.reward_karma,
        type: 'task_reward',
        description: `Начисление за задание: ${assignment.tasks.title}`
      })
  }

  return res.status(200).json({ success: true })
}
