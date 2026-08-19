import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'
import { bandFor } from '../../../lib/kpi'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, { permission: 'can_review_tasks' })
  if (!ctx) return
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { metricId, from, to } = req.query
  const { data: employees } = await sb.from('profiles')
    .select('user_id, email, display_name, first_name, last_name')
    .eq('company_id', ctx.profile.company_id).is('deleted_at', null).eq('is_company_admin', false)
  const { data: metrics } = await sb.from('kpi_metrics').select('*').eq('company_id', ctx.profile.company_id).eq('is_active', true)
  const userIds = (employees || []).map(e => e.user_id)
  let balMap = {}
  if (userIds.length) {
    const { data: bals } = await sb.from('karma_balance').select('user_id, balance').in('user_id', userIds)
    balMap = Object.fromEntries((bals || []).map(b => [b.user_id, Number(b.balance) || 0]))
  }
  const rows = []
  for (const emp of employees || []) {
    let q = sb.from('kpi_entries').select('*').eq('user_id', emp.user_id)
    if (metricId) q = q.eq('metric_id', metricId)
    if (from) q = q.gte('entry_date', from)
    if (to) q = q.lte('entry_date', to)
    const { data: entries } = await q.order('entry_date', { ascending: false })
    const { data: en } = await sb.from('kpi_energy').select('energy').eq('user_id', emp.user_id).maybeSingle()
    const { data: tests } = await sb.from('kpi_test_results').select('*').eq('user_id', emp.user_id).eq('passed', true)
    const latest = {}
    ;(entries || []).forEach(e => { if (!(e.metric_id in latest)) latest[e.metric_id] = e })
    rows.push({
      user_id: emp.user_id,
      name: [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.display_name || emp.email,
      energy: en?.energy || 0,
      balance: balMap[emp.user_id] ?? 0,
      tests_passed: (tests || []).length,
      entries: entries || [],
      latest: Object.values(latest).map(e => ({ ...e, band: (() => { const m = (metrics || []).find(x => x.id === e.metric_id); return m ? bandFor(e.value, m) : 'none' })() }))
    })
  }
  res.status(200).json({ metrics: metrics || [], rows })
}
