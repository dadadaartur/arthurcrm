import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { assignmentId, action } = req.body
  const numericId = parseInt(assignmentId, 10)

  if (!numericId || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Неверные параметры' })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: assignment, error: fetchError } = await supabaseAdmin
    .from('task_assignments')
    .select('id, user_id, task_id, status, tasks( id, title, reward_karma )')
    .eq('id', numericId)
    .single()

  if (fetchError || !assignment) {
    return res.status(404).json({ error: 'Назначение не найдено' })
  }

  if (assignment.status !== 'pending_review') {
    return res.status(400).json({ error: 'Задание не на проверке' })
  }

  const newStatus = action === 'approve' ? 'completed' : 'in_progress'

  const { error: updateError } = await supabaseAdmin
    .from('task_assignments')
    .update({
      status: newStatus,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', numericId)

  if (updateError) {
    return res.status(500).json({ error: 'Ошибка обновления: ' + updateError.message })
  }

  if (action === 'approve' && assignment.tasks.reward_karma > 0) {
    const reward = assignment.tasks.reward_karma

    await supabaseAdmin.from('karma_transactions').insert({
      user_id: assignment.user_id,
      amount: reward,
      type: 'task_reward',
      description: 'Выполнено задание: ' + assignment.tasks.title
    })

    const { data: balanceRow } = await supabaseAdmin
      .from('karma_balance')
      .select('balance')
      .eq('user_id', assignment.user_id)
      .single()

    const newBalance = (balanceRow?.balance || 0) + reward
    await supabaseAdmin
      .from('karma_balance')
      .upsert({ user_id: assignment.user_id, balance: newBalance }, { onConflict: 'user_id' })
  }

  res.status(200).json({ result: 'OK' })
}
