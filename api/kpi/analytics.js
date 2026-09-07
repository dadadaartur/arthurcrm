import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../lib/auth'
import { getManagerScope } from '../../../lib/departments'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  if (!hasPermission(ctx.profile, 'can_review_tasks') && !ctx.profile?.is_company_admin) return res.status(403).json({ error: 'Недостаточно прав' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { from, to, userId, metricId } = req.query
  const cid = ctx.profile.company_id

  const { data: metrics } = await a.from('kpi_metrics').select('*').eq('company_id', cid).eq('is_active', true)
  let { data: employees } = await a.from('profiles').select('user_id, first_name, last_name, display_name, email, department_id').eq('company_id', cid).is('deleted_at', null).eq('is_company_admin', false)

  // Зона ответственности (п.6 ТЗ) — руководитель отдела видит аналитику
  // своей команды и всех вложенных отделов (руководители руководителей
  // получают сводную картину по подчинённым командам автоматически, без
  // отдельной логики), а не всей компании.
  const { data: allDepartments } = await a.from('departments').select('id, parent_department_id, manager_user_id').eq('company_id', cid)
  const scope = getManagerScope(ctx.profile, allDepartments || [])
  if (scope !== null) {
    employees = (employees || []).filter(e => scope.includes(e.department_id))
  }

  const scopedUserIds = (employees || []).map(e => e.user_id)
  let q = a.from('kpi_entries').select('*').eq('company_id', cid).order('entry_date')
  if (from) q = q.gte('entry_date', from)
  if (to) q = q.lte('entry_date', to)
  if (userId) q = q.eq('user_id', userId)
  if (metricId) q = q.eq('metric_id', Number(metricId))
  if (scope !== null) q = q.in('user_id', scopedUserIds.length ? scopedUserIds : ['00000000-0000-0000-0000-000000000000'])
  const { data: entries } = await q

  res.status(200).json({ metrics: metrics || [], employees: employees || [], entries: entries || [], scope: scope === null ? 'company' : 'team' })
}
