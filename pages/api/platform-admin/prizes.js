import { createClient } from '@supabase/supabase-js'
import { requirePlatformStaff } from '../../../lib/auth'

// Учёт призов для суперадмина — только источник partner_task (призы от
// партнёрских заданий, которые сам суперадмин и создаёт), по всем
// компаниям платформы сразу. Призы ленты подарков — внутреннее дело
// компании, здесь не показываются.
export default async function handler(req, res) {
  const ctx = await requirePlatformStaff(req, res, { permission: 'manage_partner_tasks' })
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (req.method === 'PATCH') {
    const { id, fulfilled } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Не указан приз' })
    const { error } = await a.from('prize_awards')
      .update({ fulfilled: !!fulfilled, fulfilled_at: fulfilled ? new Date().toISOString() : null, fulfilled_by: fulfilled ? ctx.user.id : null })
      .eq('id', id).eq('source', 'partner_task')
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  const { data: awards } = await a.from('prize_awards')
    .select('id, source_task_id, label, description, awarded_at, fulfilled, user_id, company_id, companies(name)')
    .eq('source', 'partner_task').order('awarded_at', { ascending: false })

  const userIds = [...new Set((awards || []).map(x => x.user_id))]
  const { data: profiles } = userIds.length ? await a.from('profiles').select('user_id, first_name, last_name, display_name, email').in('user_id', userIds) : { data: [] }
  const nameById = {}
  ;(profiles || []).forEach(p => { nameById[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || p.email })

  res.status(200).json({
    awards: (awards || []).map(a => ({ ...a, userName: nameById[a.user_id] || '—', companyName: a.companies?.name || '—' })),
  })
}
