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

  // Получаем токен пользователя
  let accessToken = null
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.split(' ')[1]
  }
  if (!accessToken) {
    const rawCookie = req.headers.cookie || ''
    const cookies = Object.fromEntries(rawCookie.split('; ').map(c => {
      const idx = c.indexOf('='); return idx === -1 ? [c.trim(), ''] : [c.substring(0, idx).trim(), decodeURIComponent(c.substring(idx + 1))]
    }))
    const authKey = Object.keys(cookies).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
    if (authKey) {
      try { const parsed = JSON.parse(cookies[authKey]); accessToken = parsed.access_token } catch (e) {}
    }
  }
  if (!accessToken) return res.status(401).json({ error: 'Не авторизован' })

  const supabaseClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser(accessToken)
  if (userError || !user) return res.status(401).json({ error: 'Токен недействителен' })

  try {
    const { data: newBalance, error: rpcError } = await supabaseAdmin.rpc('transfer_karma', {
      sender_id: user.id,
      recipient_email: recipientEmail,
      amount_to_transfer: transferAmount,
      transfer_comment: comment || ''
    })

    if (rpcError) {
      // Пытаемся разобрать текст ошибки из PostgreSQL
      const msg = rpcError.message || 'Ошибка перевода'
      if (msg.includes('Получатель не найден')) return res.status(404).json({ error: 'Получатель не найден' })
      if (msg.includes('Нельзя перевести самому себе')) return res.status(400).json({ error: 'Нельзя перевести самому себе' })
      if (msg.includes('Недостаточно средств')) return res.status(400).json({ error: 'Недостаточно кармиков' })
      return res.status(500).json({ error: msg })
    }

    // Уведомления обеим сторонам
    await supabaseAdmin.from('notifications').insert({
      user_id: user.id,
      message: `Вы перевели ${transferAmount} кармиков пользователю ${recipientEmail}`,
      link: '/history'
    })
    // Получателю отправим через нативный запрос, чтобы не усложнять
    const { data: recp } = await supabaseAdmin.from('profiles').select('user_id').eq('email', recipientEmail.toLowerCase().trim()).single()
    if (recp) {
      await supabaseAdmin.from('notifications').insert({
        user_id: recp.user_id,
        message: `Вам перевели ${transferAmount} кармиков от ${user.email}.${comment ? ' Комментарий: ' + comment : ''}`,
        link: '/history'
      })
    }

    res.status(200).json({ newBalance })
  } catch (err) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}
