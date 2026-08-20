import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'
import { z } from 'zod'

// Схема валидации входных данных
const transferSchema = z.object({
  recipientUserId: z.string().uuid(),
  amount: z.number().int().positive(),
  comment: z.string().optional().nullable()
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // 1. Проверка авторизации
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  // 2. Валидация тела запроса
  let validated
  try {
    validated = transferSchema.parse(req.body)
  } catch (err) {
    return res.status(400).json({ error: err.errors })
  }

  const { recipientUserId, amount, comment } = validated

  // 3. Проверка, что пользователь не переводит сам себе
  if (recipientUserId === ctx.user.id) {
    return res.status(400).json({ error: 'Нельзя перевести самому себе' })
  }

  // 4. Проверка, что у пользователя есть компания
  if (!ctx.profile.company_id) {
    return res.status(400).json({ error: 'У вас нет компании' })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 5. Проверка, что получатель существует, активен и из той же компании
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

  // 6. Атомарный перевод через RPC (с блокировкой строк)
  const { data: result, error: transferError } = await supabaseAdmin
    .rpc('transfer_karma', {
      p_from_user_id: ctx.user.id,
      p_to_user_id: recipient.user_id,
      p_amount: amount,
      p_comment: comment || null
    })
    .single()

  if (transferError) {
    console.error('[transfer] ошибка RPC:', transferError)
    // Сообщения об ошибках от БД (недостаточно кармиков, компания неактивна)
    // уже приходят в transferError.message, можно показать пользователю
    const status = /недостаточно|неактивна|не найден/.test(transferError.message) ? 400 : 500
    return res.status(status).json({ error: transferError.message })
  }

  // 7. Уведомления (best effort)
  const recipientEmail = recipient.email || recipientUserId
  await supabaseAdmin.from('notifications').insert([
    {
      user_id: ctx.user.id,
      message: `Вы перевели ${amount} кармиков → ${recipientEmail}${comment ? '. ' + comment : ''}`,
      link: '/history'
    },
    {
      user_id: recipient.user_id,
      message: `Вам перевели ${amount} кармиков от ${ctx.profile.email || ctx.user.email}${comment ? '. Комментарий: ' + comment : ''}`,
      link: '/history'
    }
  ])

  res.status(200).json({ newBalance: result.new_sender_balance })
}
