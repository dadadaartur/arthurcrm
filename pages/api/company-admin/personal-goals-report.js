import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Отчёт руководителя по личным целям команды (по запросу от
// 6 сентября 2026: «руководитель видел отчёт по целям, которые себе
// поставил сотрудник, и насколько он продвигается»). Только просмотр
// — редактировать чужие личные цели админ не может, это личное.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId || !ctx.profile.is_company_admin) return res.status(403).json({ error: 'Только администратор компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: goals } = await a.from('personal_goals').select('*').eq('company_id', companyId).eq('status', 'active').order('user_id')
  const userIds = [...new Set((goals || []).map(g => g.user_id))]
  const { data: profiles } = userIds.length ? await a.from('profiles').select('user_id, first_name, last_name, display_name, email').in('user_id', userIds) : { data: [] }
  const nameById = {}
  ;(profiles || []).forEach(p => { nameById[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || p.email })

  const byEmployee = {}
  ;(goals || []).forEach(g => {
    if (!byEmployee[g.user_id]) byEmployee[g.user_id] = { userId: g.user_id, name: nameById[g.user_id] || '—', goals: [] }
    const pct = g.target_value ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : null
    byEmployee[g.user_id].goals.push({ ...g, progressPct: pct })
  })

  res.status(200).json({ employees: Object.values(byEmployee) })
}
