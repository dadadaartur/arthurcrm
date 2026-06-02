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
  // Получаем задание
  const { data: assignment, error: fetchError } = await supabaseAdmin
    .from('task_assignments')
    .select('id, user_id, tasks( requires_review, reward_karma )')
    .eq('id', assignmentId)
    .single()

  if (fetchError || !assignment || assignment.user_id !== user.id) {
    return res.status(404).json({ error: 'Assignment not found' })
  }

  const newStatus = assignment.tasks?.requires_review ? 'pending_review' : 'completed'
  const { error: updateError } = await supabaseAdmin
    .from('task_assignments')
    .update({ status: newStatus, completed_at: new Date().toISOString() })
    .eq('id', assignmentId)

  if (updateError) return res.status(500).json({ error: updateError.message })

  if (newStatus === 'completed') {
    const reward = assignment.tasks?.reward_karma || 0
    if (reward > 0) {
      await supabaseAdmin.from('karma_transactions').insert({
        user_id: user.id,
        amount: reward,
        type: 'task_reward',
        description: 'Начисление за задание'
      })
      const { data: bal } = await supabaseAdmin
        .from('karma_balance')
        .select('balance')
        .eq('user_id', user.id)
        .single()
      if (bal) {
        await supabaseAdmin
          .from('karma_balance')
          .update({ balance: bal.balance + reward })
          .eq('user_id', user.id)
      }
    }
  }

  res.status(200).json({ success: true })
}
