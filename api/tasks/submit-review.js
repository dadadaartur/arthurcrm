import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Сотрудник отправляет задание на проверку. Серверный роут нужен, чтобы:
// 1) атомарно перевести статус (защита от двойной отправки),
// 2) уведомить ревьюеров компании (клиенту вставлять notifications
//    запрещает RLS — поэтому только через service_role здесь).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  const { assignmentId, comment } = req.body
  const id = parseInt(assignmentId, 10)
  if (!id) return res.status(400).json({ error: 'Нет assignmentId' })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: assignment } = await supabaseAdmin
    .from('task_assignments')
    .select('id, user_id, status, task_id, tasks(id, title, company_id, reward_karma)')
    .eq('id', id)
    .single()

  if (!assignment) return res.status(404).json({ error: 'Назначение не найдено' })
  if (assignment.user_id !== ctx.user.id) {
    return res.status(403).json({ error: 'Это не ваше задание' })
  }
  if (assignment.status !== 'in_progress') {
    return res.status(400).json({ error: 'Задание должно быть в работе' })
  }

  const { data: updated, error } = await supabaseAdmin
    .from('task_assignments')
    .update({
      status: 'pending_review',
      comment: comment || null,
      completed_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('status', 'in_progress')
    .select('id')

  if (error) return res.status(500).json({ error: error.message })
  if (!updated || updated.length === 0) {
    return res.status(409).json({ error: 'Задание уже отправлено на проверку' })
  }

  // Уведомляем ревьюеров компании: админ компании + модераторы с правом проверки
  const companyId = assignment.tasks?.company_id
  if (companyId) {
    const { data: reviewers } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('company_id', companyId)
      .or('is_company_admin.eq.true,can_review_tasks.eq.true')
      .is('deleted_at', null)

    if (reviewers?.length) {
      const senderName = ctx.profile.display_name || ctx.profile.email || 'Сотрудник'
      await supabaseAdmin.from('notifications').insert(
        reviewers.map(r => ({
          user_id: r.user_id,
          type: 'task_review',
          message: `${senderName} отправил задание "${assignment.tasks.title}" на проверку.`,
          link: '/company-admin/review'
        }))
      )
    }
  }

  res.status(200).json({ success: true })
}
