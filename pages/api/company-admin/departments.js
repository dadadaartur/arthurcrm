import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../lib/auth'
import { getManagerScope, getSubtreeIds } from '../../../lib/departments'

// Управление отделами компании (п.6 ТЗ). Дерево произвольной глубины через
// parent_department_id (см. migrations/011_department_hierarchy.sql).
//
// Зона ответственности (см. lib/departments.js::getManagerScope):
// админ компании (is_company_admin) видит и управляет всем; руководитель
// отдела — своим отделом и всеми вложенными (руководитель руководителей
// автоматически получает в зону команды своих подчинённых руководителей,
// отдельной логики для этого не нужно — дерево работает само по себе).
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: allDepartments } = await a.from('departments').select('*').eq('company_id', companyId).order('name')
  const scope = getManagerScope(ctx.profile, allDepartments || [])

  if (req.method === 'GET') {
    const { data: allEmployees } = await a.from('profiles').select('user_id, email, first_name, last_name, display_name, department_id, manager_id, is_company_admin, avatar_url')
      .eq('company_id', companyId).is('deleted_at', null)
    if (scope === null) {
      return res.status(200).json({ departments: allDepartments || [], employees: allEmployees || [], scope: null })
    }
    // Руководитель отдела видит только свою зону — не всю компанию.
    const visibleDepartments = (allDepartments || []).filter(d => scope.includes(d.id))
    const visibleEmployees = (allEmployees || []).filter(e => scope.includes(e.department_id) || e.user_id === ctx.user.id)
    return res.status(200).json({ departments: visibleDepartments, employees: visibleEmployees, scope })
  }

  // Дальше — операции изменения. Разрешены: админу компании — везде;
  // руководителю отдела — только внутри своей зоны ответственности.
  const canManageGlobally = ctx.profile?.is_company_admin || hasPermission(ctx.profile, 'can_manage_employees')
  const inScope = deptId => scope === null || scope.includes(deptId)

  if (req.method === 'POST') {
    const { name, parentDepartmentId, managerUserId } = req.body || {}
    if (!name?.trim()) return res.status(400).json({ error: 'Укажите название отдела' })
    // Новый отдел на верхнем уровне (без родителя) может создать только
    // админ компании — руководитель отдела создаёт подотделы внутри своей
    // зоны, а не параллельные независимые ветки дерева.
    if (!parentDepartmentId && !canManageGlobally) return res.status(403).json({ error: 'Только администратор компании может создавать отделы верхнего уровня' })
    if (parentDepartmentId) {
      if (!inScope(parentDepartmentId)) return res.status(403).json({ error: 'Этот отдел вне вашей зоны ответственности' })
      const parent = (allDepartments || []).find(d => d.id === parentDepartmentId)
      if (!parent) return res.status(400).json({ error: 'Родительский отдел не найден' })
    }
    const { data, error } = await a.from('departments').insert({
      company_id: companyId, name: name.trim(),
      parent_department_id: parentDepartmentId || null,
      manager_user_id: managerUserId || null,
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'PUT') {
    const { id, name, parentDepartmentId, managerUserId } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Нет id' })
    if (!inScope(id)) return res.status(403).json({ error: 'Этот отдел вне вашей зоны ответственности' })
    if (parentDepartmentId && String(parentDepartmentId) === String(id)) {
      return res.status(400).json({ error: 'Отдел не может быть родителем самому себе' })
    }
    // Нельзя перенести отдел внутрь его же собственного поддерева —
    // разорвёт дерево на два несвязанных куска с точки зрения обхода.
    if (parentDepartmentId && getSubtreeIds(allDepartments, id).includes(parentDepartmentId)) {
      return res.status(400).json({ error: 'Нельзя сделать родителем один из вложенных отделов' })
    }
    const fields = {}
    if (name !== undefined) fields.name = name.trim()
    if (parentDepartmentId !== undefined) fields.parent_department_id = parentDepartmentId || null
    if (managerUserId !== undefined) fields.manager_user_id = managerUserId || null
    const { error } = await a.from('departments').update(fields).eq('id', id).eq('company_id', companyId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    if (!inScope(id)) return res.status(403).json({ error: 'Этот отдел вне вашей зоны ответственности' })
    await a.from('departments').update({ parent_department_id: null }).eq('parent_department_id', id).eq('company_id', companyId)
    await a.from('profiles').update({ department_id: null }).eq('department_id', id).eq('company_id', companyId)
    const { error } = await a.from('departments').delete().eq('id', id).eq('company_id', companyId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  if (req.method === 'PATCH') {
    const { userId, departmentId, managerId } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Нет userId' })
    if (departmentId !== undefined && departmentId && !inScope(departmentId)) return res.status(403).json({ error: 'Этот отдел вне вашей зоны ответственности' })
    if (!canManageGlobally && scope.length === 0) return res.status(403).json({ error: 'Недостаточно прав' })
    const fields = {}
    if (departmentId !== undefined) fields.department_id = departmentId || null
    if (managerId !== undefined) fields.manager_id = managerId || null
    const { error } = await a.from('profiles').update(fields).eq('user_id', userId).eq('company_id', companyId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  res.status(405).end()
}
