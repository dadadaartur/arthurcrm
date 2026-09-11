import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Одобрение личной цели (по запросу от 6 сентября 2026) — руководитель
// направляет и корректирует, не просто наблюдает. approved — как есть,
// needs_adjustment — с комментарием, что поправить (не амбициозно
// достаточно, нереалистично и т.д.).
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId || !ctx.profile.is_company_admin) return res.status(403).json({ error: 'Только администратор компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { id, decision, comment } = req.body || {}
  if (!['approved', 'needs_adjustment'].includes(decision)) return res.status(400).json({ error: 'Неизвестное решение' })
  const { data: goal } = await a.from('personal_goals').select('user_id, company_id, title').eq('id', id).maybeSingle()
  if (!goal || goal.company_id !== companyId) return res.status(404).json({ error: 'Цель не найдена' })

  await a.from('personal_goals').update({ approval_status: decision, manager_comment: comment || null }).eq('id', id)
  await a.from('notifications').insert({
    user_id: goal.user_id,
    message: decision === 'approved'
      ? `Ваша цель «${goal.title}» одобрена руководителем!`
      : `Руководитель предлагает скорректировать цель «${goal.title}»${comment ? `: ${comment}` : ''}`,
    link: '/goals',
  })
  res.status(200).json({ success: true })
}
