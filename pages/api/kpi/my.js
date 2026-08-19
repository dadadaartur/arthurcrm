import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'
import { bandFor } from '../../../lib/kpi'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const companyId = ctx.profile?.company_id
  const { data: metrics } = await a.from('kpi_metrics').select('*').eq('company_id', companyId).eq('is_active', true).order('id')
  const ids = (metrics || []).map(m => m.id)
  let entries = [], trainings = []
  if (ids.length) {
    const [e, t] = await Promise.all([
      a.from('kpi_entries').select('*').eq('user_id', ctx.user.id).in('metric_id', ids).order('entry_date', { ascending: false }).limit(400),
      a.from('kpi_trainings').select('*').in('metric_id', ids).order('sort_order')
    ])
    entries = e.data || []
    trainings = t.data || []
  }
  const out = (metrics || []).map(m => {
    const hist = entries.filter(e => e.metric_id === m.id)
    const current = hist.length ? Number(hist[0].value) : null
    return { ...m, history: hist, current, band: current != null ? bandFor(current, m) : 'none', trainings: trainings.filter(t => t.metric_id === m.id) }
  })
  const { data: en } = await a.from('kpi_energy').select('energy').eq('user_id', ctx.user.id).maybeSingle()
  res.status(200).json({ metrics: out, energy: en?.energy || 0 })
}
