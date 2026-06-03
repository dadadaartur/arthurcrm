import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { assignmentId, action } = req.body
  // Приводим assignmentId к целому числу
  const numericId = parseInt(assignmentId, 10)

  if (!numericId || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Неверные параметры' })
  }

  // Сервисный клиент для выполнения привилегированных операций
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Получаем назначение и задание
  const { data: assignment, error: fetchError } = await supabaseAdmin
    .from('task_assignments')
    .select('id, user_id, task_id, status, tasks( id, title, reward_karma )')
    .eq('id', numericId)
    .single()

  if (fetchError || !assignment) {
    return res.status(404).json({ error: 'Назначение не найдено' })
  }

  // ... (остальной код без изменений, как в предыдущей версии API)
}
