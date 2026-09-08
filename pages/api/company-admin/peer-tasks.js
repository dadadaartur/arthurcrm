import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Модерация шуточных заданий (марафон ИИ-аналитика, часть 2,
// 6 сентября 2026) — одобрение админом создаёт настоящую запись в
// tasks, переиспользуя существующую инфраструктуру заданий целиком
// (та же таблица, тот же флоу выполнения/проверки у сотрудника), не
// отдельную parallel-систему.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId || !ctx.profile.is_company_admin) return res.status(403).json({ error: 'Только администратор компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (req.method === 'PUT') {
    const { id, action, reviewNote } = req.body || {} // action: 'approve' | 'reject'
    const { data: pt } = await a.from('peer_tasks').select('*').eq('id', id).eq('company_id', companyId).maybeSingle()
    if (!pt) return res.status(404).json({ error: 'Заявка не найдена' })
    if (pt.status !== 'pending') return res.status(400).json({ error: 'Заявка уже рассмотрена' })

    if (action === 'approve') {
      const { data: createdByProfile } = await a.from('profiles').select('display_name, email').eq('user_id', pt.created_by).single()
      const authorName = createdByProfile?.display_name || createdByProfile?.email || 'коллега'
      const { data: task } = await a.from('tasks').insert({
        company_id: companyId, title: pt.title, description: pt.description,
        reward_karma: pt.reward_karma, target_role: 'specific', target_user_ids: pt.target_user_ids,
        requires_review: true, created_by: ctx.user.id,
        partner_name: null, visual_tier: 'priority', // приоритетное свечение — оно яркое и заметное, подходит для «весёлого» задания
      }).select().single()
      await a.from('task_assignments').insert(pt.target_user_ids.map(uid => ({ task_id: task.id, user_id: uid, status: 'assigned' })))
      await a.from('peer_tasks').update({ status: 'approved', reviewed_by: ctx.user.id, reviewed_at: new Date().toISOString(), resulting_task_id: task.id, review_note: reviewNote || null }).eq('id', id)
      await a.from('notifications').insert(pt.target_user_ids.map(uid => ({ user_id: uid, message: `Новое шуточное задание от ${authorName}: «${pt.title}»`, link: `/task/${task.id}` })))
    } else {
      await a.from('peer_tasks').update({ status: 'rejected', reviewed_by: ctx.user.id, reviewed_at: new Date().toISOString(), review_note: reviewNote || null }).eq('id', id)
      await a.from('notifications').insert({ user_id: pt.created_by, message: `Заявка на шуточное задание «${pt.title}» отклонена админом${reviewNote ? ': ' + reviewNote : ''}` })
    }
    return res.status(200).json({ success: true })
  }

  const { data: pending } = await a.from('peer_tasks').select('*').eq('company_id', companyId).order('created_at', { ascending: false })
  const userIds = [...new Set((pending || []).flatMap(p => [p.created_by, ...p.target_user_ids]))]
  const { data: profiles } = userIds.length ? await a.from('profiles').select('user_id, first_name, last_name, display_name, email').in('user_id', userIds) : { data: [] }
  const nameById = {}
  ;(profiles || []).forEach(p => { nameById[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || p.email })
  res.status(200).json({ tasks: (pending || []).map(p => ({ ...p, authorName: nameById[p.created_by] || '—', targetNames: p.target_user_ids.map(id => nameById[id] || '—') })) })
}
