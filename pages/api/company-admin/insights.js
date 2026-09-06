import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'
import { getManagerScope, getSubtreeIds } from '../../../lib/departments'
import { bandFor, bandRankOf } from '../../../lib/kpi'

// ИИ-аналитик руководителя (начало марафона, пункт 4 фидбека от
// 6 сентября 2026) — вместо графика с десятком перепутанных линий,
// который «становится нечитаемым при большом числе сотрудников»,
// система сама находит, что заслуживает внимания, и объясняет простым
// языком. Первая версия — статистический движок (тренды, отклонение от
// команды), не вызов языковой модели: быстрее, бесплатно в работе,
// предсказуемо. Живую генерацию текста поверх этих находок можно
// добавить отдельным шагом позже, если понадобится.
//
// Три вида находок:
//  risk   — устойчивое падение несколько отрезков подряд, не разовый провал
//  anomaly — сотрудник заметно хуже команды по показателю (та же логика
//            сравнения, что уже работает в рекомендациях по заданиям)
//  win    — устойчивый рост, достойный признания, не только проблемы

const isSum = m => m.kpi_type === 'cumulative' || m.kpi_type === 'min_period'
const agg = (m, list) => {
  if (!list.length) return null
  const s = list.reduce((a, e) => a + Number(e.value), 0)
  return isSum(m) ? s : s / list.length
}

// Делит диапазон дат на N примерно равных отрезков по датам (не по
// количеству записей) — так «было → стало» сравнивает время, а не
// произвольно перемешанные точки данных.
function splitPeriods(fromISO, toISO, n = 3) {
  const from = new Date(fromISO), to = new Date(toISO)
  const totalDays = Math.max(1, Math.round((to - from) / 86400000) + 1)
  const periods = []
  for (let i = 0; i < n; i++) {
    const start = new Date(from); start.setDate(start.getDate() + Math.floor((totalDays / n) * i))
    const end = new Date(from); end.setDate(end.getDate() + Math.floor((totalDays / n) * (i + 1)) - 1)
    periods.push({ from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) })
  }
  return periods
}

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const from = req.query.from || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
  const to = req.query.to || new Date().toISOString().slice(0, 10)
  const periods = splitPeriods(from, to, 3)

  const { data: allDepartments } = await a.from('departments').select('id, parent_department_id, manager_user_id').eq('company_id', companyId)
  const scope = getManagerScope(ctx.profile, allDepartments || [])
  let empQuery = a.from('profiles').select('user_id, first_name, last_name, display_name, email, department_id')
    .eq('company_id', companyId).eq('is_company_admin', false).is('deleted_at', null)
  const { data: allEmps } = await empQuery
  let pool = allEmps || []
  if (scope !== null) {
    const scopeDeptIds = new Set(scope.flatMap(d => getSubtreeIds(allDepartments || [], d)))
    pool = pool.filter(e => scopeDeptIds.has(e.department_id))
  }
  if (pool.length < 3) return res.status(200).json({ insights: [], reason: 'too_few_employees' })
  const poolIds = new Set(pool.map(e => e.user_id))
  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email
  const empById = Object.fromEntries(pool.map(e => [e.user_id, e]))

  const { data: metrics } = await a.from('kpi_metrics').select('*').eq('company_id', companyId).eq('is_active', true)
  const { data: entries } = await a.from('kpi_entries').select('metric_id, user_id, value, entry_date')
    .gte('entry_date', from).lte('entry_date', to).in('user_id', [...poolIds])

  const insights = []

  for (const m of metrics || []) {
    const metricEntries = (entries || []).filter(e => e.metric_id === m.id)
    if (metricEntries.length === 0) continue

    // Значение каждого сотрудника на каждом из трёх отрезков — основа
    // и для тренда, и для срав��ения с командой в последнем отрезке.
    const byEmpByPeriod = {}
    pool.forEach(e => { byEmpByPeriod[e.user_id] = periods.map(p => agg(m, metricEntries.filter(x => x.user_id === e.user_id && x.entry_date >= p.from && x.entry_date <= p.to))) })

    // РИСК — устойчивое падение: последний отрезок заметно (от 15%)
    // ниже первого, и каждый следующий отрезок не выше предыдущего
    // (не разовый провал с последующим восстановлением).
    for (const emp of pool) {
      const vals = byEmpByPeriod[emp.user_id]
      if (vals.some(v => v == null)) continue
      const monotoneDown = vals.every((v, i) => i === 0 || v <= vals[i - 1] + 1e-9)
      const changePct = vals[0] > 0 ? Math.round(((vals[vals.length - 1] - vals[0]) / vals[0]) * 100) : null
      if (monotoneDown && changePct != null && changePct <= -15) {
        insights.push({
          type: 'risk', metricId: m.id, metricName: m.name, userId: emp.user_id, userName: empName(emp),
          changePct, from: Math.round(vals[0] * 10) / 10, to: Math.round(vals[vals.length - 1] * 10) / 10, unit: m.unit,
          text: `${empName(emp)} — устойчивое падение по «${m.name}»: было ${Math.round(vals[0] * 10) / 10}${m.unit || ''}, сейчас ${Math.round(vals[vals.length - 1] * 10) / 10}${m.unit || ''} (${changePct}%)`,
        })
      }
    }

    // ПОБЕДА — зеркально риску, устойчивый рост от 20%.
    for (const emp of pool) {
      const vals = byEmpByPeriod[emp.user_id]
      if (vals.some(v => v == null)) continue
      const monotoneUp = vals.every((v, i) => i === 0 || v >= vals[i - 1] - 1e-9)
      const changePct = vals[0] > 0 ? Math.round(((vals[vals.length - 1] - vals[0]) / vals[0]) * 100) : null
      if (monotoneUp && changePct != null && changePct >= 20) {
        insights.push({
          type: 'win', metricId: m.id, metricName: m.name, userId: emp.user_id, userName: empName(emp),
          changePct, from: Math.round(vals[0] * 10) / 10, to: Math.round(vals[vals.length - 1] * 10) / 10, unit: m.unit,
          text: `${empName(emp)} — устойчивый рост по «${m.name}»: было ${Math.round(vals[0] * 10) / 10}${m.unit || ''}, сейчас ${Math.round(vals[vals.length - 1] * 10) / 10}${m.unit || ''} (+${changePct}%)`,
        })
      }
    }

    // АНОМАЛИЯ — та же логика, что уже работает в рекомендациях по
    // заданиям: ранг сотрудника заметно (от 1.5) ниже среднего ранга
    // команды за весь период, отстающих не больше 40% команды (иначе
    // это не аномалия одного-двух, а общая проблема показателя).
    const ranked = pool.map(e => {
      const val = agg(m, metricEntries.filter(x => x.user_id === e.user_id))
      const band = val != null ? bandFor(val, m) : 'none'
      return { emp: e, rank: bandRankOf(m, band), hasData: val != null }
    })
    const avgRank = ranked.reduce((s, r) => s + r.rank, 0) / ranked.length
    if (avgRank >= 1.8) {
      const outliers = ranked.filter(r => r.rank <= avgRank - 1.5)
      if (outliers.length >= 1 && outliers.length / ranked.length <= 0.4) {
        outliers.forEach(o => {
          insights.push({
            type: 'anomaly', metricId: m.id, metricName: m.name, userId: o.emp.user_id, userName: empName(o.emp),
            text: `${empName(o.emp)} заметно отстаёт от команды по «${m.name}»`,
          })
        })
      }
    }
  }

  // Риски — первыми (важнее всего успеть среагировать), потом аномалии, потом победы.
  const order = { risk: 0, anomaly: 1, win: 2 }
  insights.sort((x, y) => order[x.type] - order[y.type] || (y.changePct || 0) - (x.changePct || 0))

  res.status(200).json({ insights, periods })
}
