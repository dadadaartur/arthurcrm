import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Единый учёт призов для админа компании — по проверке от 2 сентября
// 2026: раньше выигранный приз (лента подарков или бонус-приз
// партнёрского задания) нигде не был виден админу структурированно,
// только в тексте уведомления самому сотруднику.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (req.method === 'PATCH') {
    const { id, fulfilled, fulfillmentNote } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Не указан приз' })
    const { error } = await a.from('prize_awards')
      .update({ fulfilled: !!fulfilled, fulfilled_at: fulfilled ? new Date().toISOString() : null, fulfilled_by: fulfilled ? ctx.user.id : null, fulfillment_note: fulfillmentNote || null })
      .eq('id', id).eq('company_id', companyId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  const { data: awards } = await a.from('prize_awards')
    .select('id, source, source_task_id, label, description, awarded_at, fulfilled, fulfilled_at, fulfillment_note, user_id')
    .eq('company_id', companyId).order('awarded_at', { ascending: false })

  const userIds = [...new Set((awards || []).map(x => x.user_id))]
  const { data: profiles } = userIds.length ? await a.from('profiles').select('user_id, first_name, last_name, display_name, email').in('user_id', userIds) : { data: [] }
  const nameById = {}
  ;(profiles || []).forEach(p => { nameById[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || p.email })

  res.status(200).json({
    awards: (awards || []).map(a => ({ ...a, userName: nameById[a.user_id] || '—' })),
  })
}
