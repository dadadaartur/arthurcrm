import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  const { recipientUserId, amount, comment } = req.body || {}
  const transferAmount = Number.isInteger(amount) ? amount : parseInt(amount, 10)

  // Базовая валидация (без zod)
  if (!recipientUserId || !Number.isInteger(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({ error: 'Неверные параметры' })
  }
  if (!ctx.profile.company_id) {
    return res.status(400).json({ error: 'У вас нет компании' })
  }
  if (recipientUserId === ctx.user.id) {
    return res.status(400).json({ error: 'Нельзя перевести самому себе' })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Проверяем получателя
  const { data: recipient, error: recipError } = await supabaseAdmin
    .from('profiles')
    .select('user_id, email, company_id')
    .eq('user_id', recipientUserId)
    .is('deleted_at', null)
    .maybeSingle()

  if (recipError || !recipient) {
    return res.status(404).json({ error: 'Получатель не найден' })
  }
  if (recipient.company_id !== ctx.profile.company_id) {
    return res.status(403).json({ error: 'Получатель из другой компании' })
  }

  // Атомарный перевод через RPC
  const { data: result, error: transferError } = await supabaseAdmin
    .rpc('transfer_karma', {
      p_from_user_id: ctx.user.id,
      p_to_user_id: recipient.user_id,
      p_amount: transferAmount,
      p_comment: comment || null
    })
    .single()

  if (transferError) {
    console.error('[transfer] ошибка RPC:', transferError)
    const status = /недостаточно|неактивна|не найден/.test(transferError.message) ? 400 : 500
    return res.status(status).json({ error: transferError.message })
  }

  // Уведомления
  await supabaseAdmin.from('notifications').insert([
    {
      user_id: ctx.user.id,
      message: `Вы перевели ${transferAmount} кармиков → ${recipient.email}`,
      link: '/history'
    },
    {
      user_id: recipient.user_id,
      message: `Вам перевели ${transferAmount} кармиков от ${ctx.profile.email || ctx.user.email}`,
      link: '/history'
    }
  ])

  res.status(200).json({ newBalance: result.new_sender_balance })
}
