import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAuth(req, res, { allowedRoles: [1, 2] })
  if (!auth) return

  const { assignmentId, approved, reviewComment } = req.body

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const { data: assignment, error: fetchError } = await supabase
    .from('task_assignments')
    .select('*, tasks ( reward_karma, title )')
    .eq('id', assignmentId)
    .single()

  if (fetchError || assignment.status !== 'pending_review') {
    return res.status(400).json({ error: 'Нельзя проверить это задание' })
  }

  const newStatus = approved ? 'completed' : 'in_progress'
  const updateData = {
    status: newStatus,
    reviewed_by: auth.user.id,
    reviewed_at: new Date(),
    review_comment: reviewComment
  }

  if (approved) {
    updateData.reward_karma = assignment.tasks.reward_karma
    // Начисляем кармики
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

  const { error } = await supabase
    .from('task_assignments')
    .update(updateData)
    .eq('id', assignmentId)

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ success: true })
}
