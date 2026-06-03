import { createClient } from '@supabase/supabase-js'

function parseSupabaseToken(cookieHeader) {
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(';').map(c => c.trim())
  const authCookie = cookies.find(c => c.startsWith('sb-') && c.endsWith('-auth-token'))
  if (!authCookie) return null
  const value = authCookie.split('=')[1]
  if (!value) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(value))
    return parsed.access_token || null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // 1. Извлекаем access_token из куки
  const token = parseSupabaseToken(req.headers.cookie || '')
  if (!token) {
    return res.status(401).json({ error: 'Не авторизован (токен не найден)' })
  }

  // 2. Проверяем токен с помощью анонимного клиента (без сервисного ключа)
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

  if (authError || !user) {
    return res.status(401).json({ error: 'Не авторизован (недействительный токен)' })
  }

  // 3. Проверяем, что пользователь — администратор
  const { data: profile, error: profileError } = await supabaseClient
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

  // 4. Сервисный клиент для выполнения привилегированных операций
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

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

  if (action === 'approve' && assignment.tasks.reward_karma > 0) {
    const reward = assignment.tasks.reward_karma

    await supabaseAdmin.from('karma_transactions').insert({
      user_id: assignment.user_id,
      amount: reward,
      type: 'task_reward',
      description: 'Выполнено задание: ' + assignment.tasks.title
    })

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
