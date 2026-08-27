import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../../lib/auth'
import { getManagerScope } from '../../../../lib/departments'

const clean = b => {
  const { num, den, mode, id, ...rest } = b || {}
  return rest
}

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const companyId = ctx.profile?.company_id

  const { data: allDepartments } = await a.from('departments').select('id, parent_department_id, manager_user_id').eq('company_id', companyId)
  const scope = getManagerScope(ctx.profile, allDepartments || [])

  if (req.method === 'GET') {
    const { data } = await a.from('kpi_metrics').select('*').eq('company_id', companyId).eq('is_active', true).order('id')
    // Изоляция команд (миграция 013): админ компании видит всё. Руководитель
    // отдела видит на этой (административной) странице то, чем реально
    // управляет — общие для компании показатели плюс всё в своей зоне
    // (свой отдел и все вложенные, включая команды подчинённых
    // руководителей) — а не то же самое, что видел бы рядовой сотрудник
    // на своей персональной странице целей.
    if (scope === null) return res.status(200).json(data || [])
    const visible = (data || []).filter(m => !m.department_id || scope.includes(m.department_id))
    return res.status(200).json(visible)
  }

  const isAdmin = ctx.profile?.is_company_admin || hasPermission(ctx.profile, 'can_manage_employees') || scope.length > 0
  if (!isAdmin) return res.status(403).json({ error: 'Недостаточно прав' })
  // Отдел, на который назначается показатель, должен быть в зоне
  // ответственности создателя — руководитель отдела не может создать
  // показатель для чужой ветки (или для всей компании сразу — это делает
  // только админ компании).
  const checkDeptScope = deptId => {
    if (scope === null) return true // админ компании — можно всё
    if (!deptId) return false // "вся компания" не для руководителя отдела
    return scope.includes(deptId)
  }

  if (req.method === 'POST') {
    const b = clean(req.body)
    if (!checkDeptScope(b.department_id)) return res.status(403).json({ error: 'Этот отдел вне вашей зоны ответственности' })
    const { data, error } = await a.from('kpi_metrics').insert({
      company_id: companyId, department_id: b.department_id || null,
      name: String(b.name || '').slice(0, 24), unit: b.unit || '%', kpi_type: b.kpi_type || 'cumulative',
      thr_min: Number(b.thr_min) || 0, thr_mid: Number(b.thr_mid) || 0, thr_top: Number(b.thr_top) || 0, thr_ultra: Number(b.thr_ultra) || 0,
      energy_min: Number(b.energy_min) || 0, energy_mid: Number(b.energy_mid) || 0, energy_top: Number(b.energy_top) || 0, energy_ultra: Number(b.energy_ultra) || 0,
      karma_min: Number(b.karma_min) || 0, karma_mid: Number(b.karma_mid) || 0, karma_top: Number(b.karma_top) || 0, karma_ultra: Number(b.karma_ultra) || 0,
      // Гибкие пороги (см. migrations/005) — необязательный массив кастомных
      // уровней. Если не передан (стандартный шаблон из 4 уровней выше) —
      // остаётся null, показатель работает по старым 4 столбцам как раньше.
      thresholds: Array.isArray(b.thresholds) && b.thresholds.length > 0 ? b.thresholds : null,
      source: b.source === 'auto' ? 'auto' : 'manual', source_config: b.source === 'auto' ? (b.source_config || null) : null,
      period: ['daily', 'weekly', 'monthly', 'quarterly'].includes(b.period) ? b.period : 'daily',
      reset_hour: b.reset_hour !== undefined && b.reset_hour !== null && b.reset_hour !== '' ? Math.max(0, Math.min(23, Number(b.reset_hour) || 0)) : 8,
      reward_image_url: b.reward_image_url || null, reward_description: b.reward_description || null,
      description: b.description || null, advice: b.advice || null, inputs: b.inputs || null, formula: b.formula || null, is_active: true
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'PUT') {
    const { id, ...raw } = req.body
    const fields = clean(raw)
    if (fields.department_id !== undefined && !checkDeptScope(fields.department_id)) return res.status(403).json({ error: 'Этот отдел вне вашей зоны ответственности' })
    if (fields.name) fields.name = String(fields.name).slice(0, 24)
    ;['thr_min', 'thr_mid', 'thr_top', 'thr_ultra', 'energy_min', 'energy_mid', 'energy_top', 'energy_ultra', 'karma_min', 'karma_mid', 'karma_top', 'karma_ultra'].forEach(k => { if (fields[k] !== undefined) fields[k] = Number(fields[k]) || 0 })
    if (fields.thresholds !== undefined) fields.thresholds = Array.isArray(fields.thresholds) && fields.thresholds.length > 0 ? fields.thresholds : null
    if (fields.source !== undefined) { fields.source = fields.source === 'auto' ? 'auto' : 'manual'; if (fields.source !== 'auto') fields.source_config = null }
    if (fields.period !== undefined) fields.period = ['daily', 'weekly', 'monthly', 'quarterly'].includes(fields.period) ? fields.period : 'daily'
    if (fields.reset_hour !== undefined) fields.reset_hour = Math.max(0, Math.min(23, Number(fields.reset_hour) || 0))
    const { error } = await a.from('kpi_metrics').update(fields).eq('id', id).eq('company_id', companyId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  if (req.method === 'DELETE') {
    const id = req.body?.id || req.query.id
    if (!id) return res.status(400).json({ error: 'Не указан id показателя' })
    const { error } = await a.from('kpi_metrics').update({ is_active: false }).eq('id', id).eq('company_id', companyId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  res.status(405).end()
}
