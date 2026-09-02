import { getSubtreeIds } from './departments'
import { bandFor, bandRankOf } from './kpi'

// Единый резолвер «кому назначить задание» — раньше это правило было
// продублировано в tasks/create.js (при создании) и в cron
// check-deadlines.js (при регенерации периода регулярного задания),
// независимо друг от друга. Каждое новое расширение таргетинга (по
// уровню мастерства, по показателю, по энергии) теперь пишется здесь
// один раз, а не рискует разойтись в двух местах.
//
// Режимы target_role:
//   all          — все сотрудники в зоне (вся компания или отдел)
//   new          — трудоустроены менее 30 дней назад
//   experienced  — трудоустроены 30+ дней назад
//   specific     — явно выбранные сотрудники (task.target_user_ids)
//   level        — сотрудники на одном из выбранных уровней мастерства
//                  (task.target_level_ids)
//   metric_below — не достигают минимального порога по показателю
//                  task.target_metric_id за сегодня (включая тех, кто
//                  вообще не внёс значение — тоже считается «не
//                  выполняет»)
//   energy_bottom — N сотрудников с наименьшей энергией
//                  (task.target_bottom_n, по умолчанию 5)
export async function resolveTaskAudience(supabase, task, opts = {}) {
  const companyId = task.company_id
  const { data: allEmps } = await supabase.from('profiles')
    .select('user_id, hire_date, department_id')
    .eq('company_id', companyId).eq('is_company_admin', false).is('deleted_at', null)
  let pool = allEmps || []

  if (task.department_id) {
    const depts = opts.allDepartments || (await supabase.from('departments').select('id, parent_department_id').eq('company_id', companyId)).data || []
    const deptIds = getSubtreeIds(depts, task.department_id)
    pool = pool.filter(e => deptIds.includes(e.department_id))
  }

  const poolIds = pool.map(e => e.user_id)
  if (!poolIds.length) return []

  if (task.target_role === 'specific') {
    const chosen = new Set(task.target_user_ids || [])
    return poolIds.filter(id => chosen.has(id))
  }

  if (task.target_role === 'new' || task.target_role === 'experienced') {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
    return pool.filter(e => {
      const isNew = e.hire_date && new Date(e.hire_date) > cutoff
      return task.target_role === 'new' ? isNew : !isNew
    }).map(e => e.user_id)
  }

  if (task.target_role === 'level') {
    const levelIds = new Set(task.target_level_ids || [])
    if (!levelIds.size) return []
    const { data: levels } = await supabase.from('progress_levels').select('*').eq('company_id', companyId).order('energy_threshold')
    const sorted = [...(levels || [])].sort((a, b) => b.energy_threshold - a.energy_threshold)
    const { data: energies } = await supabase.from('kpi_energy').select('user_id, energy').in('user_id', poolIds)
    const energyByUser = {}
    ;(energies || []).forEach(e => { energyByUser[e.user_id] = e.energy })
    return pool.filter(e => {
      const energy = energyByUser[e.user_id] || 0
      const cur = sorted.find(l => energy >= l.energy_threshold)
      return cur && levelIds.has(cur.id)
    }).map(e => e.user_id)
  }

  if (task.target_role === 'metric_below') {
    const metricId = task.target_metric_id
    if (!metricId) return []
    const { data: metric } = await supabase.from('kpi_metrics').select('*').eq('id', metricId).maybeSingle()
    if (!metric) return []
    const minRank = Number(task.target_metric_rank) > 0 ? Number(task.target_metric_rank) : 1
    const today = new Date().toISOString().slice(0, 10)
    const { data: entries } = await supabase.from('kpi_entries').select('user_id, value').eq('metric_id', metricId).eq('entry_date', today)
    const byUser = {}
    ;(entries || []).forEach(e => { byUser[e.user_id] = e.value })
    return pool.filter(e => {
      const val = byUser[e.user_id]
      if (val == null) return true // нет данных за сегодня — тоже «не выполняет»
      return bandRankOf(metric, bandFor(val, metric)) < minRank
    }).map(e => e.user_id)
  }

  if (task.target_role === 'energy_bottom') {
    const n = Number(task.target_bottom_n) > 0 ? Number(task.target_bottom_n) : 5
    const { data: energies } = await supabase.from('kpi_energy').select('user_id, energy').in('user_id', poolIds)
    const energyByUser = {}
    ;(energies || []).forEach(e => { energyByUser[e.user_id] = e.energy })
    return [...pool]
      .sort((a, b) => (energyByUser[a.user_id] || 0) - (energyByUser[b.user_id] || 0))
      .slice(0, n)
      .map(e => e.user_id)
  }

  // 'all' и любой нераспознанный режим — вся зона целиком, прежнее поведение.
  return poolIds
}
