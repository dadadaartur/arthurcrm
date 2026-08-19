import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'
import { bandFor } from '../../../lib/kpi'
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: metrics } = await sb.from('kpi_metrics').select('*').eq('company_id', ctx.profile.company_id).eq('is_active', true).order('id')
  const out = []
  for (const m of metrics || []) {
    const { data: entries } = await sb.from('kpi_entries').select('*').eq('metric_id', m.id).eq('user_id', ctx.user.id).order('entry_date', { ascending: false }).limit(14)
    const { data: trainings } = await sb.from('kpi_trainings').select('*').eq('metric_id', m.id).order('sort_order')
    const current = entries?.[0]?.value ?? null
    out.push({ ...m, current, band: current != null ? bandFor(current, m) : 'none', history: entries || [], trainings: trainings || [] })
  }
  const { data: en } = await sb.from('kpi_energy').select('energy').eq('user_id', ctx.user.id).maybeSingle()
  res.status(200).json({ metrics: out, energy: en?.energy || 0 })
}
