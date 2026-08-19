import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../../lib/auth'
import { bandFor, BAND_RANK, energyFor, karmaFor } from '../../../../lib/kpi'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, { permission: 'can_review_tasks' })
  if (!ctx) return
  const { date, entries } = req.body
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'Нет данных' })
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  for (const e of entries) {
    const { data: metric } = await sb.from('kpi_metrics').select('*').eq('id', e.metricId).maybeSingle()
    if (!metric) continue
    const newBand = bandFor(e.value, metric)
    const { data: existing } = await sb.from('kpi_entries').select('*')
      .eq('metric_id', e.metricId).eq('user_id', e.userId).eq('entry_date', date).maybeSingle()
    const oldBand = existing?.granted_band || 'none'

    await sb.from('kpi_entries').upsert({
      metric_id: e.metricId, user_id: e.userId, company_id: metric.company_id,
      value: e.value, entry_date: date, source: 'manual', created_by: ctx.user.id,
      granted_band: BAND_RANK[newBand] > BAND_RANK[oldBand] ? newBand : oldBand
    }, { onConflict: 'metric_id,user_id,entry_date' })

    if (BAND_RANK[newBand] > BAND_RANK[oldBand]) {
      const dEnergy = energyFor(metric, newBand) - energyFor(metric, oldBand)
      const dKarma = karmaFor(metric, newBand) - karmaFor(metric, oldBand)
      if (dEnergy > 0) {
        const { data: en } = await sb.from('kpi_energy').select('*').eq('user_id', e.userId).maybeSingle()
        await sb.from('kpi_energy').upsert({ user_id: e.userId, energy: (en?.energy || 0) + dEnergy, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      }
      if (dKarma > 0) {
        const { data: bal } = await sb.from('karma_balance').select('balance').eq('user_id', e.userId).maybeSingle()
        await sb.from('karma_balance').upsert({ user_id: e.userId, balance: (bal?.balance || 0) + dKarma }, { onConflict: 'user_id' })
        await sb.from('karma_transactions').insert({ user_id: e.userId, amount: dKarma, type: 'kpi_bonus', description: `KPI «${metric.name}»: уровень ${newBand}` })
      }
    }
  }
  res.status(200).json({ success: true })
}
