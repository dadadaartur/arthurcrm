import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../../lib/auth'

// Назначить действие развития (по итогам обсуждения от 6 сентября
// 2026) — не только задание, а тренинг, тест/срез знаний или
// мотивирующее задание, единой точкой. Каждое действие фиксируется в
// development_actions с отслеживаемым дедлайном, независимо от типа.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId || (!ctx.profile.is_company_admin && !ctx.profile.can_review_tasks)) return res.status(403).json({ error: 'Недостаточно прав' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (req.method === 'GET') {
    // План развития конкретного сотрудника — вся история действий на одной странице.
    const userId = req.query.userId
    if (!userId) return res.status(400).json({ error: 'Не указан сотрудник' })
    const { data: actions } = await a.from('development_actions').select('*').eq('company_id', companyId).eq('user_id', userId).order('created_at', { ascending: false })
    return res.status(200).json({ actions: actions || [] })
  }

  const { actionType, userId, title, reason, deadline, rewardKarma, testId, trainingNote } = req.body || {}
  if (!userId || !title?.trim()) return res.status(400).json({ error: 'Укажите сотрудника и название' })
  if (!['task', 'training', 'test'].includes(actionType)) return res.status(400).json({ error: 'Неизвестный тип действия' })

  let referenceId = null

  if (actionType === 'task') {
    const { data: task, error } = await a.from('tasks').insert({
      company_id: companyId, title: title.trim(), description: reason || null,
      reward_karma: Math.max(1, Number(rewardKarma) || 20), target_role: 'specific', target_user_ids: [userId],
      requires_review: true, deadline_at: deadline ? `${deadline}T23:59:59Z` : null, created_by: ctx.user.id,
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    await a.from('task_assignments').insert({ task_id: task.id, user_id: userId, status: 'assigned', deadline_at: deadline ? `${deadline}T23:59:59Z` : null })
    referenceId = task.id
    await a.from('notifications').insert({ user_id: userId, message: `Новое задание: «${title}»`, link: `/task/${referenceId}` })
  } else if (actionType === 'test') {
    if (!testId) return res.status(400).json({ error: 'Выберите тест' })
    referenceId = testId
    await a.from('notifications').insert({ user_id: userId, message: `Назначен тест: «${title}»${deadline ? `, срок до ${deadline}` : ''}`, link: `/test/${testId}` })
  } else if (actionType === 'training') {
    await a.from('notifications').insert({ user_id: userId, message: `Назначено обучение: «${title}»${trainingNote ? ' — ' + trainingNote : ''}${deadline ? `, срок до ${deadline}` : ''}` })
  }

  const { error: devError } = await a.from('development_actions').insert({
    company_id: companyId, user_id: userId, action_type: actionType, title: title.trim(),
    reason: reason || null, reference_id: referenceId, deadline: deadline || null, created_by: ctx.user.id,
  })
  if (devError) return res.status(500).json({ error: devError.message })

  res.status(200).json({ success: true })
}
