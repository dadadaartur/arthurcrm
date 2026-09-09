import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'
import { bandFor, bandRankOf } from '../../lib/kpi'

// Единый рейтинг по трём измерениям (по прямому запросу от
// 6 сентября 2026: «нужны рейтинги по целям, кармикам, энергии, ты
// слишком все упрощаешь») — вместо того чтобы плодить три отдельных
// эндпоинта, один параметр dimension переключает логику подсчёта.
//
// karma  — сумма положительных начислений кармы за выбранный период
// energy — текущее значение энергии (kpi_energy), не за период —
//          энергия это накопленный уровень, не поток события
// goals  — средний ранг уровня показателя (0 ниже нормы .. 4 ультра)
//          по всем активным показателям сотрудника за период, тот же
//          принцип, что уже используется в «Топ периода» аналитики
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const dimension = ['karma', 'energy', 'goals'].includes(req.query.dimension) ? req.query.dimension : 'karma'
  const now = new Date()
  const from = req.query.from || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const to = req.query.to || now.toISOString().slice(0, 10)

  const { data: employees } = await a.from('profiles').select('user_id, first_name, last_name, display_name, email, avatar_url')
    .eq('company_id', companyId).eq('is_company_admin', false).is('deleted_at', null)
  const empIds = (employees || []).map(e => e.user_id)
  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email
  if (!empIds.length) return res.status(200).json({ standings: [], dimension })

  let scoreByUser = {}
  let unit = ''

  if (dimension === 'karma') {
    const { data: txns } = await a.from('karma_transactions').select('user_id, amount').in('user_id', empIds).gte('created_at', `${from}T00:00:00`).lte('created_at', `${to}T23:59:59`).gt('amount', 0)
    ;(txns || []).forEach(t => { scoreByUser[t.user_id] = (scoreByUser[t.user_id] || 0) + Number(t.amount) })
    unit = ' карм.'
  } else if (dimension === 'energy') {
    const { data: energies } = await a.from('kpi_energy').select('user_id, energy').in('user_id', empIds)
    ;(energies || []).forEach(e => { scoreByUser[e.user_id] = Number(e.energy) || 0 })
    unit = ' эн.'
  } else {
    const { data: metrics } = await a.from('kpi_metrics').select('*').eq('company_id', companyId).eq('is_active', true)
    const { data: entries } = await a.from('kpi_entries').select('metric_id, user_id, value').eq('company_id', companyId).gte('entry_date', from).lte('entry_date', to).in('user_id', empIds)
    for (const uid of empIds) {
      let totalRank = 0, count = 0
      for (const m of metrics || []) {
        const vals = (entries || []).filter(e => e.metric_id === m.id && e.user_id === uid).map(e => Number(e.value))
        if (!vals.length) continue
        const avg = vals.reduce((s, v) => s + v, 0) / vals.length
        totalRank += bandRankOf(m, bandFor(avg, m))
        count++
      }
      if (count > 0) scoreByUser[uid] = Math.round((totalRank / count) * 100) / 100
    }
    unit = ' / 4'
  }

  const standings = (employees || [])
    .map(e => ({ userId: e.user_id, name: empName(e), avatarUrl: e.avatar_url || null, score: scoreByUser[e.user_id] || 0 }))
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, place: i + 1 }))

  res.status(200).json({ standings, dimension, unit, from, to })
}
