import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../../lib/auth'
import { getManagerScope } from '../../../../lib/departments'
import { currentPeriodKey } from '../../../../lib/recurrence'
import { resolveTaskAudience } from '../../../../lib/taskAudience'

// Создание задания — перенесено с прямой клиентской вставки на сервер
// (миграция 013, изоляция команд): раньше admin.js писал прямо в
// tasks/task_assignments из браузера, и ни проверить, ни ограничить зону
// отдела для руководителя было невозможно надёжно — RLS для этого не
// заводился, а клиентский код мог просто не вызвать нужную проверку.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: allDepartments } = await a.from('departments').select('id, parent_department_id, manager_user_id').eq('company_id', companyId)
  const scope = getManagerScope(ctx.profile, allDepartments || [])
  const canManage = ctx.profile?.is_company_admin || hasPermission(ctx.profile, 'can_create_tasks') || (scope && scope.length > 0)
  if (!canManage) return res.status(403).json({ error: 'Недостаточно прав' })

  const f = req.body || {}
  if (!f.title?.trim()) return res.status(400).json({ error: 'Укажите название задания' })
  if (!f.reward_karma || f.reward_karma <= 0) return res.status(400).json({ error: 'Укажите награду больше 0' })

  // Отдел, на который назначается задание, должен быть в зоне
  // ответственности создателя — руководитель отдела не может назначить
  // задание на всю компанию или на чужую ветку (см. lib/departments.js).
  // Режим «конкретные сотрудники» — отдел необязателен, там своя проверка
  // зоны ниже, по каждому выбранному человеку.
  const departmentId = f.department_id || null
  if (scope !== null && f.target_role !== 'specific') {
    if (!departmentId) return res.status(403).json({ error: 'Вы не администратор компании — выберите отдел' })
    if (!scope.includes(departmentId)) return res.status(403).json({ error: 'Этот отдел вне вашей зоны ответственности' })
  }

  // Точное время дедлайна — раньше дедлайн был только датой (до конца
  // дня, 23:59:59), из-за чего короткие задания вроде «прозвонить базу
  // за 2 часа» нельзя было выразить точно. Если время не задано —
  // поведение как раньше, конец дня.
  const deadlineAt = f.deadline_date
    ? new Date(`${f.deadline_date}T${f.deadline_time || '23:59:59'}`).toISOString()
    : null
  const recurrenceType = ['hourly', 'daily', 'weekly'].includes(f.recurrence_type) ? f.recurrence_type : 'once'
  const { data: task, error } = await a.from('tasks').insert({
    company_id: companyId, department_id: departmentId,
    title: f.title, description: f.description,
    reward_karma: f.reward_karma, task_type: f.is_auto_goal ? 'auto_goal' : f.task_type,
    frequency: recurrenceType, target_role: f.target_role,
    requires_review: f.is_auto_goal ? false : f.requires_review,
    requires_proof: f.requires_proof, proof_type: f.requires_proof ? (f.proof_type || 'any') : 'any',
    deadline_at: deadlineAt, deadline_time: f.deadline_time || null, is_active: true,
    is_auto_goal: f.is_auto_goal, auto_goal_condition: f.is_auto_goal && f.auto_mode === 'general' ? f.auto_goal_condition : null,
    auto_energy: f.is_auto_goal ? f.auto_energy : 0,
    auto_metric_id: f.is_auto_goal && f.auto_mode === 'specific' && f.auto_metric_id ? f.auto_metric_id : null,
    auto_target_rank: f.is_auto_goal && f.auto_mode === 'specific' ? f.auto_target_rank : null,
    image_url: f.image_url || null,
    video_url: f.video_url || null,
    recurrence_type: recurrenceType,
    reset_hour: Number.isFinite(f.reset_hour) ? f.reset_hour : 8,
    recurrence_weekday: recurrenceType === 'weekly' ? (f.recurrence_weekday || 1) : null,
    recurrence_start_date: f.recurrence_start_date || null,
    recurrence_end_date: f.recurrence_end_date || null,
    target_user_ids: f.target_role === 'specific' ? (f.specific_user_ids || []) : null,
    target_level_ids: f.target_role === 'level' ? (f.target_level_ids || []) : null,
    target_metric_id: f.target_role === 'metric_below' ? (f.target_metric_id || null) : null,
    target_metric_rank: f.target_role === 'metric_below' ? (f.target_metric_rank || 1) : null,
    target_bottom_n: f.target_role === 'energy_bottom' ? (Number(f.target_bottom_n) || 5) : null,
    visual_tier: ['priority', 'premium'].includes(f.visual_tier) ? f.visual_tier : 'normal',
    target_count: f.target_count ? Number(f.target_count) : null,
    target_count_label: f.target_count && f.target_count_label ? String(f.target_count_label).slice(0, 40) : null
  }).select().single()
  if (error) return res.status(500).json({ error: error.message })

  // Назначение — единый резолвер lib/taskAudience.js (используется и
  // здесь, и в cron-регенерации периодов регулярных заданий, чтобы
  // правило "кому назначить" не расходилось в двух реализациях).
  if (f.target_role === 'specific' && !(f.specific_user_ids || []).length) {
    return res.status(400).json({ error: 'Выберите хотя бы одного сотрудника' })
  }
  let targetUserIds = await resolveTaskAudience(a, task, { allDepartments: allDepartments || [] })
  if (f.target_role === 'specific' && scope !== null && targetUserIds.length) {
    const { data: picked } = await a.from('profiles').select('user_id, department_id').in('user_id', targetUserIds).eq('company_id', companyId)
    const outOfScope = (picked || []).some(p => !scope.includes(p.department_id))
    if (outOfScope) return res.status(403).json({ error: 'Среди выбранных есть сотрудники вне вашей зоны ответственности' })
  }

  if (targetUserIds.length) {
    const periodKey = currentPeriodKey(task, new Date())
    const { error: asErr } = await a.from('task_assignments').insert(
      targetUserIds.map(userId => ({ task_id: task.id, user_id: userId, status: 'assigned', deadline_at: deadlineAt, period_key: periodKey }))
    )
    if (asErr) return res.status(500).json({ error: 'Задание создано, но не удалось назначить: ' + asErr.message })

    // Уведомления — раньше не отправлялись вообще ни сотрудникам, ни
    // руководителю, из-за чего новое задание можно было узнать только
    // случайно зайдя в раздел заданий.
    await a.from('notifications').insert(
      targetUserIds.map(userId => ({ user_id: userId, message: `Новое задание: «${task.title}»`, link: '/tasks' }))
    )
    if (departmentId) {
      const dept = (allDepartments || []).find(d => d.id === departmentId)
      if (dept?.manager_user_id && dept.manager_user_id !== ctx.user.id) {
        await a.from('notifications').insert({ user_id: dept.manager_user_id, message: `Новое задание «${task.title}» назначено вашей команде (${targetUserIds.length} сотр.)`, link: '/company-admin/tasks' })
      }
    }
  }

  res.status(200).json({ task, assignedCount: targetUserIds.length })
}
