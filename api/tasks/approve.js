import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../lib/auth'

// РАНЬШЕ: UPDATE на task_assignments фильтровался только по .eq('id', ...),
// без повторной проверки статуса — тот же паттерн read-then-write, что и в
// transfer.js/emit.js (см. аудит). Проверка asg.status !== 'pending_review'
// шла отдельным чтением ДО апдейта, поэтому два одновременных запроса
// (например, два ревьюера одобряют одно и то же задание почти одновременно,
// или двойной клик) оба проходили проверку и оба начисляли кармики —
// задание засчитывалось и оплачивалось дважды. Сосед этого файла,
// tasks/submit.js, уже делал условный апдейт правильно — здесь просто не
// было того же паттерна. Исправлено: апдейт статуса теперь атомарный
// (WHERE status = 'pending_review'), и начисление идёт, только если именно
// этот запрос реально сменил статус.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  if (!hasPermission(ctx.profile, 'can_review_tasks') && !ctx.profile?.is_company_admin) return res.status(403).json({ error: 'Недостаточно прав' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { assignmentId, action, comment } = req.body || {}
  if (!assignmentId || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Некорректные параметры' })

  const { data: asg } = await a.from('task_assignments').select('*, tasks(*)').eq('id', assignmentId).maybeSingle()
  if (!asg) return res.status(404).json({ error: 'Назначение не найдено' })
  if (asg.status !== 'pending_review') return res.status(400).json({ error: 'Задание не на проверке' })

  if (action === 'approve') {
    const { data: updated, error: updErr } = await a.from('task_assignments')
      .update({ status: 'completed', comment: comment || null, completed_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .eq('status', 'pending_review')
      .select('id')
    if (updErr) return res.status(500).json({ error: updErr.message })
    if (!updated || updated.length === 0) {
      return res.status(409).json({ error: 'Задание уже обработано другим запросом' })
    }
    const k = Number(asg.tasks?.reward_karma) || 0
    if (k > 0) {
      const { data: bal } = await a.from('karma_balance').select('balance').eq('user_id', asg.user_id).maybeSingle()
      await a.from('karma_balance').upsert({ user_id: asg.user_id, balance: (bal?.balance || 0) + k }, { onConflict: 'user_id' })
      await a.from('karma_transactions').insert({ user_id: asg.user_id, amount: k, type: 'task_reward', description: `Задание «${asg.tasks?.title}» одобрено` })
    }
    await a.from('notifications').insert({ user_id: asg.user_id, message: `Задание «${asg.tasks?.title}» одобрено! +${k} кармиков`, link: '/history' })
  } else {
    const { data: updated, error: updErr } = await a.from('task_assignments')
      .update({ status: 'rejected', comment: comment || null })
      .eq('id', assignmentId)
      .eq('status', 'pending_review')
      .select('id')
    if (updErr) return res.status(500).json({ error: updErr.message })
    if (!updated || updated.length === 0) {
      return res.status(409).json({ error: 'Задание уже обработано другим запросом' })
    }
    await a.from('notifications').insert({ user_id: asg.user_id, message: `Задание «${asg.tasks?.title}» отклонено.${comment ? ' Причина: ' + comment : ''}`, link: '/tasks' })
  }
  res.status(200).json({ success: true })
}
