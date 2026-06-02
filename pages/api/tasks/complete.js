import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAuth(req, res)
  if (!auth) return

  const { assignmentId, comment } = req.body

  const serviceClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Получаем назначение с заданием
  const { data: assignment, error: fetchError } = await serviceClient
    .from('task_assignments')
    .select('id, status, user_id, task_id, tasks( id, reward_karma, requires_review )')
    .eq('id', assignmentId)
    .single()

  if (fetchError || !assignment) return res.status(404).json({ error: 'Назначение не найдено' })
  if (assignment.user_id !== auth.user.id) return res.status(403).json({ error: 'Не ваше задание' })
  if (assignment.status !== 'in_progress') return res.status(400).json({ error: 'Нельзя завершить' })

  const requiresReview = assignment.tasks?.requires_review
  const newStatus = requiresReview ? 'pending_review' : 'completed'

  // Обновляем назначение
  const { error: updateError } = await serviceClient
    .from('task_assignments')
    .update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      comment: comment || null,
    })
    .eq('id', assignmentId)

  if (updateError) return res.status(500).json({ error: updateError.message })

  // Если завершено без проверки — начисляем кармики
  if (newStatus === 'completed') {
    const reward = assignment.tasks.reward_karma || 0
    if (reward > 0) {
      // Транзакция
      await serviceClient.from('karma_transactions').insert({
        user_id: auth.user.id,
        amount: reward,
        type: 'task_reward',
        description: `Начисление за задание: ${assignment.tasks.title || 'Задание'}`
      })
      // Обновить баланс
      const { data: balanceRow } = await serviceClient
        .from('karma_balance')
        .select('balance')
        .eq('user_id', auth.user.id)
        .single()
      const newBalance = (balanceRow?.balance || 0) + reward
      await serviceClient
        .from('karma_balance')
        .upsert({ user_id: auth.user.id, balance: newBalance }, { onConflict: 'user_id' })
    }
  }

  res.status(200).json({ success: true, status: newStatus })
}
