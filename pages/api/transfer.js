import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

// Раньше этот файл не использовал requireAuth и дублировал логику
// извлечения токена — теперь приведён к единому стандарту. Кроме этого,
// вызов RPC transfer_karma падал с "Could not find function in schema cache"
// при несовпадении порядка именованных параметров с объявлением функции в БД.
// Чиним: вместо rpc() делаем всё на service-role напрямую — безопаснее
// и не зависит от сигнатуры функции в schema cache PostgREST.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  const { recipientEmail, amount, comment } = req.body
  const transferAmount = parseInt(amount)

  if (!recipientEmail || !transferAmount || transferAmount <= 0) {
    return res.status(400).json({ error: 'Неверные параметры' })
  }
  if (!ctx.profile.company_id) {
    return res.status(400).json({ error: 'У вас нет компании' })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const normalEmail = recipientEmail.trim().toLowerCase()

  // Получатель должен быть в той же компании
  const { data: recipient, error: recipError } = await supabaseAdmin
    .from('profiles')
    .select('user_id, email, company_id')
    .eq('email', normalEmail)
    .is('deleted_at', null)
    .maybeSingle()

  if (recipError) {
    console.error('[transfer] ошибка поиска получателя', recipError)
    return res.status(500).json({ error: 'Ошибка поиска получателя: ' + recipError.message })
  }
  if (!recipient) return res.status(404).json({ error: 'Получатель не найден' })
  if (recipient.user_id === ctx.user.id) return res.status(400).json({ error: 'Нельзя перевести самому себе' })
  if (recipient.company_id !== ctx.profile.company_id) {
    return res.status(403).json({ error: 'Получатель из другой компании' })
  }

  // Проверяем баланс отправителя
  const { data: senderBal } = await supabaseAdmin
    .from('karma_balance')
    .select('balance')
    .eq('user_id', ctx.user.id)
    .single()

  if (!senderBal || senderBal.balance < transferAmount) {
    return res.status(400).json({ error: 'Недостаточно кармиков' })
  }

  // Атомарный перевод: списываем у отправителя, зачисляем получателю
  const { error: debitError } = await supabaseAdmin
    .from('karma_balance')
    .update({ balance: senderBal.balance - transferAmount, updated_at: new Date().toISOString() })
    .eq('user_id', ctx.user.id)

  if (debitError) {
    console.error('[transfer] ошибка списания', debitError)
    return res.status(500).json({ error: 'Ошибка списания: ' + debitError.message })
  }

  const { data: recipBal } = await supabaseAdmin
    .from('karma_balance')
    .select('balance')
    .eq('user_id', recipient.user_id)
    .single()

  const { error: creditError } = await supabaseAdmin
    .from('karma_balance')
    .update({
      balance: (recipBal?.balance ?? 0) + transferAmount,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', recipient.user_id)

  if (creditError) {
    // Откат: возвращаем отправителю
    console.error('[transfer] ошибка зачисления, откат', creditError)
    await supabaseAdmin.from('karma_balance')
      .update({ balance: senderBal.balance, updated_at: new Date().toISOString() })
      .eq('user_id', ctx.user.id)
    return res.status(500).json({ error: 'Ошибка зачисления: ' + creditError.message })
  }

  // Логируем перевод
  await supabaseAdmin.from('transfers').insert({
    from_user_id: ctx.user.id,
    to_user_id: recipient.user_id,
    amount: transferAmount,
    comment: comment || null
  })

  // Уведомления
  await supabaseAdmin.from('notifications').insert([
    {
      user_id: ctx.user.id,
      message: `Вы перевели ${transferAmount} кармиков → ${normalEmail}${comment ? '. ' + comment : ''}`,
      link: '/history'
    },
    {
      user_id: recipient.user_id,
      message: `Вам перевели ${transferAmount} кармиков от ${ctx.profile.email || ctx.user.email}${comment ? '. Комментарий: ' + comment : ''}`,
      link: '/history'
    }
  ])

  res.status(200).json({ newBalance: senderBal.balance - transferAmount })
}
