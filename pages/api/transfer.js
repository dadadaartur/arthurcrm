import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

// Атомарный перевод кармиков через RPC transfer_karma.
// Получатель ищется по user_id (из поиска коллег) или по email (запасной путь).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  const { recipientId, recipientEmail, amount, comment } = req.body
  const transferAmount = parseInt(amount, 10)

  if (!transferAmount || transferAmount <= 0 || transferAmount > 1000000) {
    return res.status(400).json({ error: 'Неверная сумма перевода' })
  }
  if (!recipientId && !recipientEmail) {
    return res.status(400).json({ error: 'Не выбран получатель' })
  }
  if (!ctx.profile.company_id) {
    return res.status(400).json({ error: 'У вас нет компании' })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 1. Находим получателя
  let recipientQuery = supabaseAdmin
    .from('profiles')
    .select('user_id, email, display_name, first_name, last_name, company_id')
    .is('deleted_at', null)

  if (recipientId) {
    recipientQuery = recipientQuery.eq('user_id', recipientId)
  } else {
    recipientQuery = recipientQuery.eq('email', recipientEmail.trim().toLowerCase())
  }

  const { data: recipient, error: recipError } = await recipientQuery.maybeSingle()
  if (recipError) {
    console.error('[transfer] ошибка поиска получателя', recipError)
    return res.status(500).json({ error: 'Ошибка поиска получателя' })
  }
  if (!recipient) return res.status(404).json({ error: 'Получатель не найден' })
  if (recipient.user_id === ctx.user.id) {
    return res.status(400).json({ error: 'Нельзя перевести самому себе' })
  }
  if (recipient.company_id !== ctx.profile.company_id) {
    return res.status(403).json({ error: 'Получатель из другой компании' })
  }

  // 2. Атомарный перевод одной функцией базы: списание, зачисление
  //    (создаёт кошелёк получателю, если его не было), запись в transfers,
  //    проверка что компания активна. Любая ошибка = полный откат.
  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('transfer_karma', {
    p_from_user_id: ctx.user.id,
    p_to_user_id: recipient.user_id,
    p_amount: transferAmount,
    p_comment: comment || null
  })

  if (rpcError) {
    console.error('[transfer] ошибка transfer_karma', rpcError)
    const msg = rpcError.message || ''
    if (msg.includes('Недостаточно')) return res.status(400).json({ error: 'Недостаточно кармиков' })
    if (msg.includes('самому себе')) return res.status(400).json({ error: 'Нельзя перевести самому себе' })
    if (msg.includes('другой компании')) return res.status(403).json({ error: 'Получатель из другой компании' })
    if (msg.includes('неактивна')) return res.status(403).json({ error: 'Компания неактивна — переводы недоступны' })
    return res.status(500).json({ error: 'Ошибка перевода: ' + msg })
  }

  const result = Array.isArray(rpcData) ? rpcData[0] : rpcData
  const recipientName = recipient.display_name
    || [recipient.first_name, recipient.last_name].filter(Boolean).join(' ')
    || recipient.email

  // 3. Уведомления обеим сторонам (с типом для фирменных иконок)
  await supabaseAdmin.from('notifications').insert([
    {
      user_id: ctx.user.id,
      type: 'transfer',
      message: `Вы перевели ${transferAmount} кармиков → ${recipientName}${comment ? '. ' + comment : ''}`,
      link: '/history'
    },
    {
      user_id: recipient.user_id,
      type: 'transfer',
      message: `Вам перевели ${transferAmount} кармиков от ${ctx.profile.display_name || ctx.profile.email || ctx.user.email}${comment ? '. Комментарий: ' + comment : ''}`,
      link: '/history'
    }
  ])

  res.status(200).json({ success: true, newBalance: result?.new_sender_balance ?? null })
}
