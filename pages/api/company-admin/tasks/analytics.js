import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../../lib/auth'
import { getManagerScope, getSubtreeIds } from '../../../../lib/departments'

// Аналитика заданий (пункт 5 фидбека от 1 сентября: «кто сколько
// заданий выполнил, какого типа, как быстро, какие выполняются плохо
// или дольше всего»). «Как быстро» считаем от created_at (момент
// назначения) до completed_at (момент одобрения/автозачёта) —
// started_at у заданий нигде не записывается технически (это поле
// реально используется только для попыток прохождения тестов, не для
// заданий), это честное ограничение, не недосмотр в этой аналитике.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const from = req.query.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const to = req.query.to || new Date().toISOString().slice(0, 10)

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
  const poolIds = new Set(pool.map(e => e.user_id))
  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email

  const { data: tasks } = await a.from('tasks').select('id, title, reward_karma, is_auto_goal, partner_name, company_id').eq('company_id', companyId)
  const taskById = {}
  ;(tasks || []).forEach(t => { taskById[t.id] = t })

  const { data: assignments } = await a.from('task_assignments')
    .select('id, task_id, user_id, status, created_at, completed_at')
    .gte('created_at', `${from}T00:00:00Z`).lte('created_at', `${to}T23:59:59Z`)
  const inScope = (assignments || []).filter(as => poolIds.has(as.user_id) && taskById[as.task_id])

  // Диагностика на случай пустого результата — вместо молчаливого нуля
  // объясняем самую вероятную причину. При ручном тестировании задания
  // часто назначают себе же (администратору) — а профиль администратора
  // (is_company_admin=true) намеренно не входит в пул «сотрудников» для
  // этой аналитики, такие назначения не будут учтены никогда, это не
  // баг, а осознанная граница подсчёта, но выглядит как «аналитика не
  // работает», если не объяснить.
  let hint = null
  if (inScope.length === 0) {
    const inRangeCount = (assignments || []).filter(as => taskById[as.task_id]).length
    if (inRangeCount > 0) hint = 'assigned_to_admins_or_outside_scope'
    else if ((assignments || []).length > 0) hint = 'no_matching_tasks_in_company'
    else hint = 'no_assignments_in_range'
  }

  const taskType = t => t.is_auto_goal ? 'auto_goal' : (t.partner_name ? 'partner' : 'regular')
  const hoursToComplete = as => as.completed_at ? (new Date(as.completed_at) - new Date(as.created_at)) / 3600000 : null

  // Сводка по компании/зоне целиком
  const total = inScope.length
  const completed = inScope.filter(a => a.status === 'completed')
  const rejected = inScope.filter(a => a.status === 'rejected')
  const missed = inScope.filter(a => a.status === 'missed')
  const times = completed.map(hoursToComplete).filter(h => h != null)
  const avgHours = times.length ? times.reduce((s, h) => s + h, 0) / times.length : null

  const byType = {}
  ;['regular', 'auto_goal', 'partner'].forEach(ty => { byType[ty] = { total: 0, completed: 0 } })
  inScope.forEach(as => { const ty = taskType(taskById[as.task_id]); byType[ty].total++; if (as.status === 'completed') byType[ty].completed++ })

  // По сотрудникам
  const byEmployee = {}
  pool.forEach(e => { byEmployee[e.user_id] = { user_id: e.user_id, name: empName(e), assigned: 0, completed: 0, rejected: 0, missed: 0, karma: 0, times: [] } })
  inScope.forEach(as => {
    const row = byEmployee[as.user_id]
    if (!row) return
    row.assigned++
    if (as.status === 'completed') { row.completed++; row.karma += taskById[as.task_id]?.reward_karma || 0; const h = hoursToComplete(as); if (h != null) row.times.push(h) }
    if (as.status === 'rejected') row.rejected++
    if (as.status === 'missed') row.missed++
  })
  const employeeStats = Object.values(byEmployee).map(r => ({
    ...r, times: undefined,
    avgHours: r.times.length ? Math.round(r.times.reduce((s, h) => s + h, 0) / r.times.length * 10) / 10 : null,
    completionRate: r.assigned ? Math.round((r.completed / r.assigned) * 100) : null,
  })).filter(r => r.assigned > 0).sort((a, b) => b.completed - a.completed)

  // По заданиям — чтобы найти проблемные (низкая доля выполнения или долгое среднее время)
  const byTask = {}
  inScope.forEach(as => {
    const t = taskById[as.task_id]
    if (!t) return
    if (!byTask[t.id]) byTask[t.id] = { task_id: t.id, title: t.title, type: taskType(t), assigned: 0, completed: 0, rejected: 0, missed: 0, times: [] }
    const row = byTask[t.id]
    row.assigned++
    if (as.status === 'completed') { row.completed++; const h = hoursToComplete(as); if (h != null) row.times.push(h) }
    if (as.status === 'rejected') row.rejected++
    if (as.status === 'missed') row.missed++
  })
  const taskStats = Object.values(byTask).map(r => ({
    ...r, times: undefined,
    avgHours: r.times.length ? Math.round(r.times.reduce((s, h) => s + h, 0) / r.times.length * 10) / 10 : null,
    completionRate: r.assigned ? Math.round((r.completed / r.assigned) * 100) : null,
  })).filter(r => r.assigned >= 2) // на одном назначении «доля выполнения» не имеет смысла

  res.status(200).json({
    hint,
    summary: {
      total, completed: completed.length, rejected: rejected.length, missed: missed.length,
      completionRate: total ? Math.round((completed.length / total) * 100) : null,
      avgHours: avgHours != null ? Math.round(avgHours * 10) / 10 : null,
      byType,
    },
    employees: employeeStats,
    tasks: taskStats.sort((a, b) => (a.completionRate ?? 100) - (b.completionRate ?? 100)), // худшие по выполнению — первыми
    slowest: [...taskStats].filter(t => t.avgHours != null).sort((a, b) => b.avgHours - a.avgHours).slice(0, 5),
  })
}
