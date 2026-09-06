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

  // Прогноз выполнения целей на текущий календарный месяц — считается
  // ВСЕГДА по календарному месяцу, независимо от выбранного на
  // странице диапазона дат (иначе «прогноз на месяц» значил бы разное
  // в зависимости от случайно выбранных from/to). По каждой цели —
  // куда идём при текущем темпе, и если промах — кто именно тянет
  // вниз (переиспользует ту же логику сравнения с командой, что и
  // аномалии, не отдельный алгоритм).
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const today = now
  const daysSoFar = Math.max(1, Math.round((today - monthStart) / 86400000) + 1)
  const daysTotal = monthEnd.getDate()
  const monthStartISO = monthStart.toISOString().slice(0, 10)
  const todayISO = today.toISOString().slice(0, 10)

  const { data: monthEntries } = daysSoFar >= 3
    ? await a.from('kpi_entries').select('metric_id, user_id, value, entry_date').gte('entry_date', monthStartISO).lte('entry_date', todayISO).in('user_id', [...poolIds])
    : { data: [] }

  const forecast = []
  if (daysSoFar >= 3) {
    for (const m of metrics || []) {
      const metricMonthEntries = (monthEntries || []).filter(e => e.metric_id === m.id)
      if (metricMonthEntries.length < 3) continue
      const midpoint = monthStartISO <= todayISO ? new Date(monthStart.getTime() + (today - monthStart) / 2) : monthStart
      const midISO = midpoint.toISOString().slice(0, 10)
      const early = metricMonthEntries.filter(e => e.entry_date < midISO)
      const recent = metricMonthEntries.filter(e => e.entry_date >= midISO)
      const earlyAvg = agg(m, early), recentAvg = agg(m, recent)
      if (earlyAvg == null || recentAvg == null) continue

      // Скорость изменения в день по последней половине месяца,
      // спроецированная на оставшиеся дни — не наивное «просто
      // продолжить линию с первого дня», а актуальный, недавний темп.
      const halfDays = Math.max(1, daysSoFar / 2)
      const dailyRate = (recentAvg - earlyAvg) / halfDays
      const daysLeft = daysTotal - daysSoFar
      const projected = Math.round((recentAvg + dailyRate * daysLeft) * 10) / 10
      const goal = Number(m.thr_top)
      const onTrack = m.kpi_type === 'inverse' ? projected <= goal : projected >= goal

      let cause = null
      if (!onTrack) {
        const ranked = pool.map(e => {
          const val = agg(m, metricMonthEntries.filter(x => x.user_id === e.user_id))
          return { emp: e, val, band: val != null ? bandFor(val, m) : 'none' }
        })
        const withData = ranked.filter(r => r.val != null)
        if (withData.length) {
          const avgRank = withData.reduce((s, r) => s + bandRankOf(m, r.band), 0) / withData.length
          const worst = withData.filter(r => bandRankOf(m, r.band) <= avgRank - 1.5).sort((a, b) => bandRankOf(m, a.band) - bandRankOf(m, b.band))
          if (worst.length) cause = worst.slice(0, 3).map(w => empName(w.emp))
        }
      }

      forecast.push({ metricId: m.id, metricName: m.name, unit: m.unit, projected, goal, onTrack, cause, lowConfidence: daysSoFar < 7 })
    }
  }
  const forecastReady = daysSoFar >= 3
  const atRiskCount = forecast.filter(f => !f.onTrack).length

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
          advice: 'Стоит для начала просто поговорить — падение три отрезка подряд обычно про конкретную причину (перегруз, личная ситуация, непонятная задача), не про лень. Задание с наградой — не первый шаг.',
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
            advice: 'Прежде чем ставить задание — проверьте, не разовый ли это случай за последние 3 записи, а не хроническое отставание.',
          })
        })
      }
    }
  }

  // Четыре сегмента команды (по итогам обсуждения от 6 сентября 2026):
  // антитоп по показателю (anomaly) и отрицательная динамика (risk) уже
  // считаются выше. Добавляем два новых — стабильно хорошие (достойны
  // признания, не просто «выросли», а держат уровень) и «середняки»,
  // которые не попадают ни в топ, ни в антитоп — их не видно нигде, и
  // именно поэтому ими легко перестать заниматься.
  const coveredUserIds = new Set(insights.map(i => i.userId).filter(Boolean))
  const overallByEmp = {}
  for (const e of pool) {
    let totalRank = 0, count = 0, allTopEveryPeriod = true
    for (const m of metrics || []) {
      const metricEntries = (entries || []).filter(x => x.metric_id === m.id)
      const periodVals = periods.map(p => agg(m, metricEntries.filter(x => x.user_id === e.user_id && x.entry_date >= p.from && x.entry_date <= p.to)))
      if (periodVals.some(v => v == null)) continue
      periodVals.forEach(v => { const r = bandRankOf(m, bandFor(v, m)); totalRank += r; count++; if (r < 3) allTopEveryPeriod = false })
    }
    if (count > 0) overallByEmp[e.user_id] = { avgRank: totalRank / count, allTopEveryPeriod }
  }

  for (const e of pool) {
    if (coveredUserIds.has(e.user_id)) continue
    const info = overallByEmp[e.user_id]
    if (info?.allTopEveryPeriod) {
      insights.push({ type: 'consistent', userId: e.user_id, userName: empName(e), text: `${empName(e)} — стабильно на топ-уровне все три отрезка периода, не просто разовый рывок.` })
      coveredUserIds.add(e.user_id)
    }
  }
  const middlePerformers = pool.filter(e => !coveredUserIds.has(e.user_id)).map(e => ({ userId: e.user_id, name: empName(e) }))

  // Риски — первыми (важнее всего успеть среагировать), потом аномалии, потом победы.
  // Тренинги и тесты — используем уже существующую систему (tests,
  // test_attempts), не строим параллельную (пункт 4 фидбека от
  // 6 сентября 2026: «должен уметь контролировать кто сколько
  // тренингов прошёл, сколько тестов сдал, на какой балл»).
  const { data: activeTests } = await a.from('tests').select('id, title').eq('company_id', companyId).eq('is_active', true)
  if (activeTests?.length) {
    const { data: attempts } = await a.from('test_attempts').select('test_id, user_id, score, is_passed').in('test_id', activeTests.map(t => t.id)).in('user_id', [...poolIds])
    for (const t of activeTests) {
      const attemptsByUser = {}
      ;(attempts || []).filter(a2 => a2.test_id === t.id).forEach(a2 => { attemptsByUser[a2.user_id] = a2 })
      const notPassed = pool.filter(e => !attemptsByUser[e.user_id]?.is_passed)
      if (notPassed.length > 0 && notPassed.length < pool.length) {
        insights.push({
          type: 'training', metricName: t.title,
          text: `«${t.title}» — не сдали ${notPassed.length} из ${pool.length}: ${notPassed.slice(0, 5).map(e => empName(e)).join(', ')}${notPassed.length > 5 ? ` и ещё ${notPassed.length - 5}` : ''}`,
          advice: 'Не обязательно новое задание — можно просто напомнить в общем чате или назначить пересдачу.',
        })
      }
    }
  }

  const order = { risk: 0, training: 1, anomaly: 2, win: 3, consistent: 4 }
  insights.sort((x, y) => order[x.type] - order[y.type] || (y.changePct || 0) - (x.changePct || 0))

  res.status(200).json({ insights, periods, middlePerformers, forecast: { ready: forecastReady, daysLeft: daysTotal - daysSoFar, items: forecast, atRiskCount, totalCount: forecast.length } })
}
