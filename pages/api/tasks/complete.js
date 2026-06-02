import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { assignmentId } = req.body

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Получаем задание
  const { data: assignment } = await serviceClient
    .from('task_assignments')
    .select('id, user_id, task_id, tasks( requires_review, reward_karma )')
    .eq('id', assignmentId)
    .single()

  if (!assignment) return res.status(404).json({ error: 'Assignment not found' })

  const newStatus = assignment.tasks?.requires_review ? 'pending_review' : 'completed'
  const { error } = await serviceClient
    .from('task_assignments')
    .update({ status: newStatus, completed_at: new Date().toISOString() })
    .eq('id', assignmentId)

  if (error) return res.status(500).json({ error: error.message })

  if (newStatus === 'completed') {
    // Начисление кармиков
    await serviceClient.from('karma_transactions').insert({
      user_id: assignment.user_id,
      amount: assignment.tasks.reward_karma,
      type: 'task_reward',
      description: 'Начисление за задание'
    })

    const { data: bal } = await serviceClient
      .from('karma_balance')
      .select('balance')
      .eq('user_id', assignment.user_id)
      .single()

    if (bal) {
      await serviceClient
        .from('karma_balance')
        .update({ balance: bal.balance + assignment.tasks.reward_karma })
        .eq('user_id', assignment.user_id)
    }
  }

  res.status(200).json({ success: true })
}
