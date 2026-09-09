import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../../lib/auth'
import { bandFor, bandRankOf } from '../../../../lib/kpi'
import { getManagerScope, getSubtreeIds } from '../../../../lib/departments'

// Проактивные рекомендации — система сама находит, по какому показателю
// часть команды заметно отстаёт от большинства, и предлагает готовое
// задание с уже подобранной аудиторией (пункт 3 фидбека от 1 сентября:
// «команда 30 менеджеров, 5 сильно хуже делают SLA — система видя это
// рекомендует руководителю этим 5 назначить задание»).
//
// Важное отличие от режима таргетинга "не выполняет показатель"
// (см. lib/taskAudience.js): там сравнение идёт с АБСОЛЮТНЫМ порогом
// показателя (не достиг минимума — точка). Здесь сравнение
// ОТНОСИТЕЛЬНОЕ — с остальной командой: если у показателя нет
// формального порога или он не настроен строго, но 5 человек всё равно
// заметно хуже 25 остальных, это тоже сигнал, который стоит показать
// руководителю. Рекомендация не создаёт задание сама — только
// показывает находку и предлагает кнопку, финальное решение всегда за
// человеком.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

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
  if (pool.length < 4) return res.status(200).json({ recommendations: [] }) // слишком маленькая команда — сравнение с "большинством" не имеет смысла

  // Барьер частоты — кому уже назначили 3+ задания за последнюю
  // неделю, того не предлагаем снова, независимо от показателей (по
  // итогам аудита от 6 сентября 2026 — решает сразу два вопроса: не
  // даёт превратить рекомендации в бесконечный цикл «занизил →
  // получил задание с наградой → занизил снова» для одного и того же
  // человека, и не даёт заваливать одного сотрудника заданиями, пока
  // остальные ничего не получают).
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: recentAssignments } = await a.from('task_assignments').select('user_id').gte('created_at', weekAgo).in('user_id', pool.map(e => e.user_id))
  const recentCountByUser = {}
  ;(recentAssignments || []).forEach(r => { recentCountByUser[r.user_id] = (recentCountByUser[r.user_id] || 0) + 1 })
  const overloadedUsers = new Set(Object.entries(recentCountByUser).filter(([, c]) => c >= 3).map(([uid]) => uid))

  const { data: metrics } = await a.from('kpi_metrics').select('*').eq('company_id', companyId).eq('is_active', true)
  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email

  const recommendations = []
  for (const metric of metrics || []) {
    // Последнее внесённое значение каждого сотрудника по этому
    // показателю (не только сегодняшнее — иначе для еженедельных
    // показателей почти у всех будет "нет данных" в произвольный день).
    // Среднее по последним ТРЁМ внесённым значениям каждого
    // сотрудника, не одно последнее (по итогам аудита от 6 сентября
    // 2026: одно последнее значение — реальная уязвимость, один
    // неудачный день, случайный или намеренный, помечал сотрудника
    // как отстающего и создавал рекомендацию с наградой за
    // «исправление» того, что могло быть разовым провалом).
    const { data: entries } = await a.from('kpi_entries')
      .select('user_id, value, entry_date')
      .eq('metric_id', metric.id).in('user_id', pool.map(e => e.user_id))
      .order('entry_date', { ascending: false })
    const recentByUser = {}
    ;(entries || []).forEach(e => { (recentByUser[e.user_id] = recentByUser[e.user_id] || []).push(e.value) })
    const latestByUser = {}
    Object.entries(recentByUser).forEach(([uid, vals]) => {
      const last3 = vals.slice(0, 3)
      latestByUser[uid] = last3.reduce((s, v) => s + Number(v), 0) / last3.length
    })

    const ranked = pool.map(e => {
      const val = latestByUser[e.user_id]
      const band = val != null ? bandFor(val, metric) : 'none'
      return { emp: e, band, rank: bandRankOf(metric, band), hasData: val != null }
    })
    const avgRank = ranked.reduce((s, r) => s + r.rank, 0) / ranked.length
    if (avgRank < 1.8) continue // команда в целом слабо тянет показатель — это не "пятеро отстают", это общая проблема, другой случай

    const laggards = ranked.filter(r => r.rank <= avgRank - 1.5 && !overloadedUsers.has(r.emp.user_id))
    const laggardShare = laggards.length / ranked.length
    if (laggards.length < 2 || laggardShare > 0.4) continue // либо некого отдельно выделить, либо отстаёт слишком много — не точечный случай

    recommendations.push({
      metric_id: metric.id,
      metric_name: metric.name,
      unit: metric.unit,
      teamSize: ranked.length,
      laggingCount: laggards.length,
      avgRank: Math.round(avgRank * 10) / 10,
      laggingEmployees: laggards.map(l => ({ user_id: l.emp.user_id, name: empName(l.emp), band: l.band, hasData: l.hasData })),
      suggestedTitle: `Подтянуть показатель «${metric.name}»`,
      suggestedDescription: `Команда в среднем справляется с этим показателем хорошо, но по последним данным вы заметно отстаёте от большинства коллег. Разберитесь, что мешает, и подтяните результат.`,
      suggestedDeadlineDays: 7,
    })
  }

  recommendations.sort((a, b) => b.laggingCount - a.laggingCount)
  res.status(200).json({ recommendations })
}
