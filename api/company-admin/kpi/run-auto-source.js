import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../../lib/auth'
import { bandFor, bandRankOf, energyFor, karmaFor } from '../../../../lib/kpi'
import { pullAutoValues } from '../../../../lib/kpiSource'

// Запуск авто-сбора по требованию — для тест-стенда (п.7 ТЗ) и для случаев,
// когда не хочется ждать до ночного cron. Логика начисления — та же самая,
// что в ручном вводе KPI (pages/api/company-admin/kpi/entries.js): пишем
// в kpi_entries, начисляем только разницу энергии/кармы между новым и
// старым уровнем. Раньше pullAutoValues() была написана, но нигде не
// вызывалась — этот роут и ночной cron (см. check-deadlines.js, секция 4)
// первые её реально используют.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  if (!hasPermission(ctx.profile, 'can_manage_employees') && !ctx.profile?.is_company_admin) return res.status(403).json({ error: 'Недостаточно прав' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const companyId = ctx.profile?.company_id

  const { metricId } = req.body || {}
  if (!metricId) return res.status(400).json({ error: 'Не указан показатель' })
  const { data: metric } = await a.from('kpi_metrics').select('*').eq('id', metricId).eq('company_id', companyId).maybeSingle()
  if (!metric) return res.status(404).json({ error: 'Показатель не найден' })
  if (metric.source !== 'auto') return res.status(400).json({ error: 'У показателя не включён автоматический источник' })

  const rows = await pullAutoValues(metric)
  if (!rows.length) return res.status(200).json({ pulled: 0, matched: 0, results: [] })

  const emails = rows.map(r => r.email).filter(Boolean)
  const { data: profiles } = await a.from('profiles').select('user_id, email, display_name').eq('company_id', companyId).in('email', emails)
  const byEmail = {}
  ;(profiles || []).forEach(p => { byEmail[p.email] = p })

  const today = new Date().toISOString().slice(0, 10)
  const results = []
  for (const row of rows) {
    const profile = byEmail[row.email]
    if (!profile) { results.push({ email: row.email, matched: false }); continue }
    const newBand = bandFor(row.value, metric)
    const { data: ex } = await a.from('kpi_entries').select('*').eq('metric_id', metricId).eq('user_id', profile.user_id).eq('entry_date', today).maybeSingle()
    const oldBand = ex?.granted_band || 'none'
    const improved = bandRankOf(metric, newBand) > bandRankOf(metric, oldBand)
    await a.from('kpi_entries').upsert({
      metric_id: metricId, user_id: profile.user_id, company_id: companyId,
      value: row.value, entry_date: today, source: 'auto', created_by: ctx.user.id,
      granted_band: improved ? newBand : oldBand
    }, { onConflict: 'metric_id,user_id,entry_date' })
    let dE = 0, dK = 0
    if (improved) {
      dE = energyFor(metric, newBand) - energyFor(metric, oldBand)
      dK = karmaFor(metric, newBand) - karmaFor(metric, oldBand)
      if (dE > 0) { const { data: en } = await a.from('kpi_energy').select('energy').eq('user_id', profile.user_id).maybeSingle(); await a.from('kpi_energy').upsert({ user_id: profile.user_id, energy: (en?.energy || 0) + dE, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }) }
      if (dK > 0) { const { data: bal } = await a.from('karma_balance').select('balance').eq('user_id', profile.user_id).maybeSingle(); await a.from('karma_balance').upsert({ user_id: profile.user_id, balance: (bal?.balance || 0) + dK }, { onConflict: 'user_id' }); await a.from('karma_transactions').insert({ user_id: profile.user_id, amount: dK, type: 'kpi_bonus', description: `KPI «${metric.name}» (авто): ${newBand}` }) }
    }
    results.push({ email: row.email, matched: true, name: profile.display_name || profile.email, value: row.value, band: newBand, improved, energyGranted: dE > 0 ? dE : 0, karmaGranted: dK > 0 ? dK : 0 })
  }

  res.status(200).json({ pulled: rows.length, matched: results.filter(r => r.matched).length, results })
}
