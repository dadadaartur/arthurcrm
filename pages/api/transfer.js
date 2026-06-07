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

  // 1. Пытаемся получить токен из заголовка Authorization
  let accessToken = null
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.split(' ')[1]
  }

  // 2. Если нет заголовка, пробуем куки
  if (!accessToken) {
    const rawCookie = req.headers.cookie || ''
    const cookies = Object.fromEntries(
      rawCookie.split('; ').map(c => {
        const idx = c.indexOf('=')
        if (idx === -1) return [c.trim(), '']
        return [c.substring(0, idx).trim(), decodeURIComponent(c.substring(idx + 1))]
      })
    )
    const authKey = Object.keys(cookies).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
    if (authKey) {
      try {
        const parsed = JSON.parse(cookies[authKey])
        accessToken = parsed.access_token
      } catch (e) { /* ignore */ }
    }
  }

  if (!accessToken) {
    return res.status(401).json({ error: 'Не авторизован' })
  }

  // Проверяем токен
  const supabaseClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser(accessToken)
  if (userError || !user) return res.status(401).json({ error: 'Токен недействителен' })

  const fromUserId = user.id

  // --- Логика перевода ---
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

  const { data: senderBalance, error: balanceError } = await supabaseAdmin
    .from('karma_balance')
    .select('balance')
    .eq('user_id', fromUserId)
    .single()

  if (balanceError || !senderBalance || senderBalance.balance < transferAmount) {
    return res.status(400).json({ error: 'Недостаточно кармиков' })
  }

  const { error: deductError } = await supabaseAdmin
    .from('karma_balance')
    .update({ balance: senderBalance.balance - transferAmount })
    .eq('user_id', fromUserId)

  if (deductError) return res.status(500).json({ error: 'Ошибка списания' })

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

  const { error: transferError } = await supabaseAdmin.from('transfers').insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    amount: transferAmount,
    comment: comment || ''
  })

  if (transferError) {
    await supabaseAdmin
      .from('karma_balance')
      .update({ balance: senderBalance.balance })
      .eq('user_id', fromUserId)
    return res.status(500).json({ error: 'Ошибка записи перевода' })
  }

  // Уведомления
  await supabaseAdmin.from('notifications').insert({
    user_id: toUserId,
    message: `Вам перевели ${transferAmount} кармиков от ${user.email}.${comment ? ' Комментарий: ' + comment : ''}`,
    link: '/history'
  })
  await supabaseAdmin.from('notifications').insert({
    user_id: fromUserId,
    message: `Вы перевели ${transferAmount} кармиков пользователю ${recipientEmail}`,
    link: '/history'
  })

  const newBalance = senderBalance.balance - transferAmount
  res.status(200).json({ newBalance })
}
