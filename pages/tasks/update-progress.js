import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Обновление количественного прогресса внутри задания (пункт 9,
// 1 сентября 2026) — сотрудник сам отмечает «сделал ещё N», не дожидаясь
// финальной сдачи задания целиком. Отдельный, узкий эндпоинт — не через
// общий submit.js, потому что это НЕ смена статуса назначения, а просто
// счётчик, статус меняется отдельно через уже существующий флоу сдачи.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const { assignmentId, progress } = req.body || {}
  if (!assignmentId || !Number.isFinite(Number(progress)) || Number(progress) < 0) {
    return res.status(400).json({ error: 'Некорректные данные' })
  }
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: assignment } = await a.from('task_assignments').select('id, user_id, task_id, tasks(target_count)').eq('id', assignmentId).maybeSingle()
  if (!assignment) return res.status(404).json({ error: 'Назначение не найдено' })
  if (assignment.user_id !== ctx.user.id) return res.status(403).json({ error: 'Это не ваше задание' })

  const target = assignment.tasks?.target_count
  const clamped = target ? Math.min(Number(progress), target) : Number(progress)

  const { error } = await a.from('task_assignments').update({ progress_count: clamped }).eq('id', assignmentId)
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ progress: clamped })
}
