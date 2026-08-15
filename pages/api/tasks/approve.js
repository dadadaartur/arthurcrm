import { createClient } from '@supabase/supabase-js'
import { requireAuth, canAccessCompany } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res, { permission: 'can_review_tasks' })
  if (!ctx) return

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
    .select('id, user_id, task_id, status, tasks( id, title, reward_karma, company_id )')
    .eq('id', numericId)
    .single()

  if (fetchError || !assignment) {
    return res.status(404).json({ error: 'Назначение не найдено' })
  }
  if (assignment.status !== 'pending_review') {
    return res.status(400).json({ error: 'Задание уже обработано' })
  }
  if (!canAccessCompany(ctx.profile, assignment.tasks?.company_id)) {
    return res.status(403).json({ error: 'Доступ запрещён: другая компания' })
  }

  const newStatus = action === 'approve' ? 'completed' : 'in_progress'

  const { data: updatedRows, error: updateError } = await supabaseAdmin
    .from('task_assignments')
    .update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: ctx.user.id
    })
    .eq('id', numericId)
    .eq('status', 'pending_review')
    .select('id')

  if (updateError) {
    return res.status(500).json({ error: 'Ошибка обновления: ' + updateError.message })
  }
  if (!updatedRows || updatedRows.length === 0) {
    return res.status(409).json({ error: 'Задание уже обработано другим запросом' })
  }

  if (action === 'approve' && assignment.tasks.reward_karma > 0) {
    const reward = assignment.tasks.reward_karma
    const { error: transactionError } = await supabaseAdmin
      .from('karma_transactions')
      .insert({
        user_id: assignment.user_id,
        amount: reward,
        type: 'task_reward',
        description: 'Выполнено задание: ' + assignment.tasks.title
      })

    if (transactionError) {
      return res.status(500).json({ error: 'Ошибка транзакции: ' + transactionError.message })
    }

    await supabaseAdmin.from('notifications').insert({
      user_id: assignment.user_id,
      type: 'task_done',
      message: `Задание "${assignment.tasks.title}" одобрено руководителем. Начислено ${reward} кармиков.`,
      link: '/tasks'
    })
  }

  await supabaseAdmin.from('audit_logs').insert({
    user_id: ctx.user.id,
    action: action === 'approve' ? 'task_approved' : 'task_rejected',
    entity_type: 'task',
    entity_id: assignmentId.toString(),
    details: { target_user_id: assignment.user_id, reward: assignment.tasks.reward_karma }
  })

  res.status(200).json({ result: 'OK' })
}
