import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { recipientEmail, amount, comment } = req.body
  const transferAmount = parseInt(amount)

  if (!recipientEmail || !transferAmount || transferAmount <= 0) {
    return res.status(400).json({ error: 'Неверные параметры' })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  // Создаём клиент с передачей кук из запроса – так он увидит сессию
  const supabaseClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { cookie: req.headers.cookie || '' } }
  })
  const { data: { session } } = await supabaseClient.auth.getSession()
  if (!session) return res.status(401).json({ error: 'Не авторизован' })

  const fromUserId = session.user.id

  // Находим получателя по email
  const { data: recipientProfile, error: recipientError } = await supabaseAdmin
    .from('profiles')
    .select('user_id, email')
    .eq('email', recipientEmail.toLowerCase().trim())
    .single()

  if (recipientError || !recipientProfile) {
    return res.status(404).json({ error: 'Получатель не найден' })
  }

  const toUserId = recipientProfile.user_id
  if (toUserId === fromUserId) {
    return res.status(400).json({ error: 'Нельзя перевести самому себе' })
  }

  // Проверяем баланс отправителя
  const { data: senderBalance, error: balanceError } = await supabaseAdmin
    .from('karma_balance')
    .select('balance')
    .eq('user_id', fromUserId)
    .single()

  if (balanceError || !senderBalance || senderBalance.balance < transferAmount) {
    return res.status(400).json({ error: 'Недостаточно кармиков' })
  }

  // Списываем у отправителя
  const { error: deductError } = await supabaseAdmin
    .from('karma_balance')
    .update({ balance: senderBalance.balance - transferAmount })
    .eq('user_id', fromUserId)

  if (deductError) return res.status(500).json({ error: 'Ошибка списания' })

  // Начисляем получателю
  const { data: recipientBalance } = await supabaseAdmin
    .from('karma_balance')
    .select('balance')
    .eq('user_id', toUserId)
    .single()

  if (!recipientBalance) {
    await supabaseAdmin.from('karma_balance').insert({ user_id: toUserId, balance: transferAmount })
  } else {
    await supabaseAdmin
      .from('karma_balance')
      .update({ balance: recipientBalance.balance + transferAmount })
      .eq('user_id', toUserId)
  }

  // Записываем перевод в таблицу transfers
  const { error: transferError } = await supabaseAdmin.from('transfers').insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    amount: transferAmount,
    comment: comment || ''
  })

  if (transferError) {
    // Откатываем списание
    await supabaseAdmin
      .from('karma_balance')
      .update({ balance: senderBalance.balance })
      .eq('user_id', fromUserId)
    return res.status(500).json({ error: 'Ошибка записи перевода' })
  }

  // Уведомление получателю
  await supabaseAdmin.from('notifications').insert({
    user_id: toUserId,
    message: `Вам перевели ${transferAmount} кармиков от ${session.user.email}.${comment ? ' Комментарий: ' + comment : ''}`,
    link: '/history'
  })

  // Уведомление отправителю
  await supabaseAdmin.from('notifications').insert({
    user_id: fromUserId,
    message: `Вы перевели ${transferAmount} кармиков пользователю ${recipientEmail}`,
    link: '/history'
  })

  const newBalance = senderBalance.balance - transferAmount
  res.status(200).json({ newBalance })
}
