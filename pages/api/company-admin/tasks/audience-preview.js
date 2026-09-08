import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../../lib/auth'
import { resolveTaskAudience } from '../../../../lib/taskAudience'

// Живой предпросмотр аудитории — вызывается при каждом изменении
// условия таргетинга в форме создания задания, чтобы админ видел «кто
// именно попадёт под это условие» ещё до нажатия «Создать», а не
// узнавал результат постфактум по факту уже разосланных уведомлений.
// Ничего не создаёт и не изменяет — тот же резолвер, что использует
// реальное создание и cron-регенерация периодов, просто с фейковым
// (ещё не сохранённым) объектом задания.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const f = req.body || {}
  const fakeTask = {
    company_id: companyId,
    department_id: f.department_id || null,
    target_role: f.target_role,
    target_user_ids: f.specific_user_ids || [],
    target_level_ids: f.target_level_ids || [],
    target_metric_id: f.target_metric_id || null,
    target_metric_rank: f.target_metric_rank || null,
    target_bottom_n: f.target_bottom_n || 5,
  }
  const userIds = await resolveTaskAudience(a, fakeTask, {})
  if (!userIds.length) return res.status(200).json({ count: 0, employees: [] })

  const { data: profiles } = await a.from('profiles')
    .select('user_id, first_name, last_name, display_name, email')
    .in('user_id', userIds)
  const employees = (profiles || []).map(p => ({
    user_id: p.user_id,
    name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || p.email
  }))
  res.status(200).json({ count: employees.length, employees })
}
