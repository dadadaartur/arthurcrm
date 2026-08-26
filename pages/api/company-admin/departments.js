import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../lib/auth'

// Управление отделами компании (п.6 ТЗ). Дерево произвольной глубины через
// parent_department_id (см. migrations/011_department_hierarchy.sql).
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (req.method === 'GET') {
    const [{ data: departments }, { data: employees }] = await Promise.all([
      a.from('departments').select('*').eq('company_id', companyId).order('name'),
      a.from('profiles').select('user_id, email, first_name, last_name, display_name, department_id, manager_id, is_company_admin, avatar_url')
        .eq('company_id', companyId).is('deleted_at', null)
    ])
    return res.status(200).json({ departments: departments || [], employees: employees || [] })
  }

  const isManager = ctx.profile?.is_company_admin || hasPermission(ctx.profile, 'can_manage_employees')
  if (!isManager) return res.status(403).json({ error: 'Недостаточно прав' })

  if (req.method === 'POST') {
    const { name, parentDepartmentId, managerUserId } = req.body || {}
    if (!name?.trim()) return res.status(400).json({ error: 'Укажите название отдела' })
    if (parentDepartmentId) {
      const { data: parent } = await a.from('departments').select('id').eq('id', parentDepartmentId).eq('company_id', companyId).maybeSingle()
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
    if (parentDepartmentId && String(parentDepartmentId) === String(id)) {
      return res.status(400).json({ error: 'Отдел не может быть родителем самому себе' })
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
    // Дочерние отделы остаются, просто теряют родителя (не удаляются
    // каскадно) — потеря целого поддерева при случайном удалении верхнего
    // отдела была бы куда неприятнее лишнего ручного шага.
    await a.from('departments').update({ parent_department_id: null }).eq('parent_department_id', id).eq('company_id', companyId)
    await a.from('profiles').update({ department_id: null }).eq('department_id', id).eq('company_id', companyId)
    const { error } = await a.from('departments').delete().eq('id', id).eq('company_id', companyId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  if (req.method === 'PATCH') {
    // Назначить сотрудника в отдел и/или назначить ему руководителя —
    // отдельно от изменения самого отдела.
    const { userId, departmentId, managerId } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Нет userId' })
    const fields = {}
    if (departmentId !== undefined) fields.department_id = departmentId || null
    if (managerId !== undefined) fields.manager_id = managerId || null
    const { error } = await a.from('profiles').update(fields).eq('user_id', userId).eq('company_id', companyId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  res.status(405).end()
}
