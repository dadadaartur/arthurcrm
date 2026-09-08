import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../lib/auth'
import { getManagerScope } from '../../../lib/departments'

// Конструктор архитектуры компании (п.6 ТЗ, сценарий от 26 августа 2026):
// админ компании расписывает отделы и почты будущих руководителей заранее
// — тем не нужно уже существовать в системе. Когда руководитель переходит
// по ссылке из письма и заводит аккаунт, pages/api/invitations/accept.js
// (и check-and-accept.js) подхватывают department_id/permissions из
// payload — а этот роут дополнительно помечает, каким именно отделом
// назначить его руководителем, как только профиль будет создан.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: allDepartments } = await a.from('departments').select('id, parent_department_id, manager_user_id').eq('company_id', companyId)
  const scope = getManagerScope(ctx.profile, allDepartments || [])
  const { email, departmentId } = req.body || {}
  if (!departmentId) return res.status(400).json({ error: 'Не указан отдел' })
  // Может пригласить руководителя: админ компании (scope === null) или
  // тот, в чью зону ответственности входит этот отдел (руководитель
  // руководителей строит свою структуру дальше сам, без участия админа
  // компании на каждом шаге — ровно как вы и описали в сценарии).
  const allowed = scope === null || scope.includes(departmentId)
  if (!allowed) return res.status(403).json({ error: 'Этот отдел вне вашей зоны ответственности' })

  const clean = String(email || '').trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(clean)) return res.status(400).json({ error: 'Некорректный email' })

  const { data: dept } = await a.from('departments').select('id, name').eq('id', departmentId).eq('company_id', companyId).maybeSingle()
  if (!dept) return res.status(404).json({ error: 'Отдел не найден' })

  const { data: existing } = await a.from('profiles').select('user_id').eq('company_id', companyId).eq('email', clean).is('deleted_at', null).maybeSingle()
  if (existing) {
    // Человек уже в компании — просто назначаем руководителем сразу,
    // без цикла приглашения.
    await a.from('departments').update({ manager_user_id: existing.user_id }).eq('id', departmentId)
    await a.from('profiles').update({ can_manage_employees: true, can_create_tasks: true, can_review_tasks: true, department_id: departmentId }).eq('user_id', existing.user_id)
    await a.from('notifications').insert({ user_id: existing.user_id, message: `Вы назначены руководителем отдела «${dept.name}»`, link: '/company-admin/departments' })
    return res.status(200).json({ status: 'assigned_existing' })
  }

  const { data: pend } = await a.from('invitations').select('id').eq('company_id', companyId).eq('email', clean).eq('status', 'pending').maybeSingle()
  if (pend) return res.status(400).json({ error: 'Приглашение этому адресу уже отправлено' })

  const { error } = await a.from('invitations').insert({
    company_id: companyId, email: clean,
    payload: {
      departmentId,
      pendingManagerDepartmentId: departmentId,
      permissions: { can_manage_employees: true, can_create_tasks: true, can_review_tasks: true, can_delete_employees: false }
    },
    status: 'pending', invited_by: ctx.user.id
  })
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ status: 'invited' })
}
