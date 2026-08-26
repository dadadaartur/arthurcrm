import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  const { assignmentId, comment, proofUrls } = req.body || {}
  const id = parseInt(assignmentId, 10)
  if (!id) return res.status(400).json({ error: 'Нет assignmentId' })

  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: asg, error: findErr } = await a
    .from('task_assignments')
    .select('id, user_id, status, task_id, tasks(id, title, company_id, reward_karma, requires_review)')
    .eq('id', id)
    .maybeSingle()

  if (findErr) return res.status(500).json({ error: findErr.message })
  if (!asg) return res.status(404).json({ error: 'Назначение не найдено' })
  if (asg.user_id !== ctx.user.id) return res.status(403).json({ error: 'Это не ваше задание' })
  if (!['assigned', 'in_progress'].includes(asg.status)) {
    return res.status(400).json({ error: 'Задание уже отправлено или завершено' })
  }

  const needsReview = !!asg.tasks?.requires_review
  const newStatus = needsReview ? 'pending_review' : 'completed'
  const now = new Date().toISOString()

  // Атомарный апдейт — защита от гонки при двойной отправке
  const { data: updated, error: updErr } = await a
    .from('task_assignments')
    .update({
      status: newStatus,
      comment: comment || null,
      proof_urls: proofUrls || [],
      completed_at: newStatus === 'completed' ? now : null
    })
    .eq('id', id)
    .in('status', ['assigned', 'in_progress'])
    .select('id')

  if (updErr) return res.status(500).json({ error: updErr.message })
  if (!updated || updated.length === 0) {
    return res.status(409).json({ error: 'Задание уже отправлено на проверку' })
  }

  // Если без проверки — сразу начисляем награду
  if (newStatus === 'completed') {
    const k = Number(asg.tasks?.reward_karma) || 0
    if (k > 0) {
      const { data: bal } = await a.from('karma_balance').select('balance').eq('user_id', asg.user_id).maybeSingle()
      await a.from('karma_balance').upsert(
        { user_id: asg.user_id, balance: (bal?.balance || 0) + k },
        { onConflict: 'user_id' }
      )
      await a.from('karma_transactions').insert({
        user_id: asg.user_id, amount: k, type: 'task_reward',
        description: `Задание «${asg.tasks?.title}»`
      })
    }
  }

  // Уведомляем ревьюеров компании
  const companyId = asg.tasks?.company_id
  if (companyId) {
    const { data: reviewers } = await a.from('profiles')
      .select('user_id').eq('company_id', companyId)
      .or('is_company_admin.eq.true,can_review_tasks.eq.true')
      .is('deleted_at', null)
    if (reviewers?.length) {
      const sender = ctx.profile.display_name || ctx.profile.email || 'Сотрудник'
      await a.from('notifications').insert(reviewers.map(r => ({
        user_id: r.user_id, type: 'task_review',
        message: `${sender} отправил задание «${asg.tasks?.title}»${needsReview ? ' на проверку' : ' (без проверки)'}`,
        link: needsReview ? '/company-admin/review' : '/company-admin/history'
      })))
    }
  }

  res.status(200).json({ success: true, status: newStatus })
}
