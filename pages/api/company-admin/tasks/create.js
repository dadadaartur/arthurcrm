import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../../lib/auth'
import { getManagerScope, getSubtreeIds } from '../../../../lib/departments'

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
  const departmentId = f.department_id || null
  if (scope !== null) {
    if (!departmentId) return res.status(403).json({ error: 'Вы не администратор компании — выберите отдел' })
    if (!scope.includes(departmentId)) return res.status(403).json({ error: 'Этот отдел вне вашей зоны ответственности' })
  }

  const deadlineAt = f.deadline_date ? new Date(f.deadline_date + 'T23:59:59').toISOString() : null
  const { data: task, error } = await a.from('tasks').insert({
    company_id: companyId, department_id: departmentId,
    title: f.title, description: f.description,
    reward_karma: f.reward_karma, task_type: f.is_auto_goal ? 'auto_goal' : f.task_type,
    frequency: f.frequency, target_role: f.target_role,
    requires_review: f.is_auto_goal ? false : f.requires_review,
    requires_proof: f.requires_proof, proof_type: f.requires_proof ? f.proof_type : null,
    deadline_at: deadlineAt, is_active: true,
    is_auto_goal: f.is_auto_goal, auto_goal_condition: f.is_auto_goal && f.auto_mode === 'general' ? f.auto_goal_condition : null,
    auto_energy: f.is_auto_goal ? f.auto_energy : 0,
    auto_metric_id: f.is_auto_goal && f.auto_mode === 'specific' && f.auto_metric_id ? f.auto_metric_id : null,
    auto_target_rank: f.is_auto_goal && f.auto_mode === 'specific' ? f.auto_target_rank : null,
    image_url: f.image_url || null
  }).select().single()
  if (error) return res.status(500).json({ error: error.message })

  // Назначение: без отдела — вся компания (как было раньше, для админа
  // компании); с отделом — только сотрудники этого отдела и всех
  // вложенных, не вся компания.
  let empQuery = a.from('profiles').select('user_id').eq('company_id', companyId).eq('is_company_admin', false).is('deleted_at', null)
  if (departmentId) {
    const targetDeptIds = getSubtreeIds(allDepartments || [], departmentId)
    empQuery = empQuery.in('department_id', targetDeptIds)
  }
  const { data: emps } = await empQuery

  if (emps?.length) {
    const { error: asErr } = await a.from('task_assignments').insert(
      emps.map(emp => ({ task_id: task.id, user_id: emp.user_id, status: 'assigned', deadline_at: deadlineAt }))
    )
    if (asErr) return res.status(500).json({ error: 'Задание создано, но не удалось назначить: ' + asErr.message })
  }

  res.status(200).json({ task, assignedCount: emps?.length || 0 })
}
