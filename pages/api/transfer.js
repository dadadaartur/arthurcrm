import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAuth(req, res)
  if (!auth) return

  const { recipientEmail, amount, comment } = req.body
  const transferAmount = parseInt(amount)
  if (!recipientEmail || !transferAmount || transferAmount <= 0) {
    return res.status(400).json({ error: 'Некорректные данные' })
  }

  const serviceClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Получить баланс отправителя
  const { data: senderBalance } = await serviceClient
    .from('karma_balance')
    .select('balance')
    .eq('user_id', auth.user.id)
    .single()

  if (!senderBalance || senderBalance.balance < transferAmount) {
    return res.status(400).json({ error: 'Недостаточно кармиков' })
  }

  // Найти получателя по email через auth.admin.listUsers (серверный вызов)
  const { data: { users }, error: listError } = await serviceClient.auth.admin.listUsers()
  if (listError) return res.status(500).json({ error: 'Ошибка поиска пользователей' })

  const recipient = users.find(u => u.email?.toLowerCase() === recipientEmail.toLowerCase())
  if (!recipient) return res.status(404).json({ error: 'Получатель не найден' })

  // Списать у отправителя
  await serviceClient
    .from('karma_balance')
    .update({ balance: senderBalance.balance - transferAmount })
    .eq('user_id', auth.user.id)

  // Начислить получателю
  const { data: recBalance } = await serviceClient
    .from('karma_balance')
    .select('balance')
    .eq('user_id', recipient.id)
    .single()
  const newRecBalance = (recBalance?.balance || 0) + transferAmount
  await serviceClient
    .from('karma_balance')
    .upsert({ user_id: recipient.id, balance: newRecBalance }, { onConflict: 'user_id' })

  // Записать транзакции
  await serviceClient.from('karma_transactions').insert([
    {
      user_id: auth.user.id,
      amount: -transferAmount,
      type: 'transfer_out',
      description: `Перевод пользователю ${recipientEmail}${comment ? ': ' + comment : ''}`
    },
    {
      user_id: recipient.id,
      amount: transferAmount,
      type: 'transfer_in',
      description: `Перевод от ${auth.user.email}${comment ? ': ' + comment : ''}`
    }
  ])

  res.status(200).json({ success: true, newBalance: senderBalance.balance - transferAmount })
}
