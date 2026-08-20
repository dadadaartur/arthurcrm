import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../lib/auth'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  if (!hasPermission(ctx.profile, 'can_review_tasks') && !ctx.profile?.is_company_admin) return res.status(403).json({ error: 'Недостаточно прав' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { from, to, userId, metricId } = req.query
  const cid = ctx.profile.company_id

  const { data: metrics } = await a.from('kpi_metrics').select('*').eq('company_id', cid).eq('is_active', true)
  const { data: employees } = await a.from('profiles').select('user_id, first_name, last_name, display_name, email').eq('company_id', cid).is('deleted_at', null).eq('is_company_admin', false)

  let q = a.from('kpi_entries').select('*').eq('company_id', cid).order('entry_date')
  if (from) q = q.gte('entry_date', from)
  if (to) q = q.lte('entry_date', to)
  if (userId) q = q.eq('user_id', userId)
  if (metricId) q = q.eq('metric_id', Number(metricId))
  const { data: entries } = await q

  res.status(200).json({ metrics: metrics || [], employees: employees || [], entries: entries || [] })
}
