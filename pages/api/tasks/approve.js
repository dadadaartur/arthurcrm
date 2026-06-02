import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // 1. Создаём серверный клиент, который читает сессию из кук
  const supabaseAuth = createPagesServerClient({ req, res })
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

  if (authError || !user) {
    return res.status(401).json({ error: 'Не авторизован' })
  }

  // 2. Проверяем, что пользователь — администратор (роль 1 или 2)
  const { data: profile, error: profileError } = await supabaseAuth
    .from('profiles')
    .select('company_id, role_id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile || (profile.role_id !== 1 && profile.role_id !== 2)) {
    return res.status(403).json({ error: 'Нет прав' })
  }

  const { assignmentId, action } = req.body
  if (!assignmentId || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Неверные параметры' })
  }

  // 3. Сервисный клиент для выполнения привилегированных действий
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Получаем назначение и задание
  const { data: assignment, error: fetchError } = await supabaseAdmin
    .from('task_assignments')
    .select('id, user_id, task_id, status, tasks( id, title, company_id, reward_karma )')
    .eq('id', assignmentId)
    .single()

  if (fetchError || !assignment) {
    return res.status(404).json({ error: 'Назначение не найдено' })
  }

  if (assignment.status !== 'pending_review') {
    return res.status(400).json({ error: 'Задание не на проверке' })
  }

  if (assignment.tasks.company_id !== profile.company_id) {
    return res.status(403).json({ error: 'Не ваша компания' })
  }

  const newStatus = action === 'approve' ? 'completed' : 'in_progress'

  // Обновляем статус назначения
  const { error: updateError } = await supabaseAdmin
    .from('task_assignments')
    .update({
      status: newStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', assignmentId)

  if (updateError) {
    return res.status(500).json({ error: 'Ошибка обновления: ' + updateError.message })
  }

  // Начисляем кармики при одобрении
  if (action === 'approve' && assignment.tasks.reward_karma > 0) {
    const reward = assignment.tasks.reward_karma

    // Вставляем транзакцию
    await supabaseAdmin.from('karma_transactions').insert({
      user_id: assignment.user_id,
      amount: reward,
      type: 'task_reward',
      description: 'Выполнено задание: ' + assignment.tasks.title
    })

    // Обновляем баланс
    const { data: balanceRow } = await supabaseAdmin
      .from('karma_balance')
      .select('balance')
      .eq('user_id', assignment.user_id)
      .single()

    const newBalance = (balanceRow?.balance || 0) + reward
    await supabaseAdmin
      .from('karma_balance')
      .upsert({ user_id: assignment.user_id, balance: newBalance }, { onConflict: 'user_id' })
  }

  res.status(200).json({ result: 'OK' })
}
