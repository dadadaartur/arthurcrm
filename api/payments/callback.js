import { createClient } from '@supabase/supabase-js'
import { settleSucceededPayment } from '../../../lib/paymentSettlement'
import { fetchYooKassaPayment } from '../../../lib/yookassa'

// Webhook от ЮKassa. URL в личном кабинете:
// https://arthurcrm.vercel.app/api/payments/callback
//
// РАНЬШЕ: event/object брались прямо из тела запроса и считались правдой —
// любой, кто знал (или подобрал) yookassa_payment_id, мог POST'нуть сюда
// { event: 'payment.succeeded', object: { id: '<id>' } } и получить
// зачисление без реальной оплаты. Теперь тело запроса используется только
// чтобы понять, КАКОЙ платёж проверить — реальный статус всегда
// переспрашивается напрямую у ЮKassa перед зачислением.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { object } = req.body || {}
  if (!object?.id) return res.status(200).json({ status: 'ignored' })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: payment } = await sb.from('payments')
    .select('*').eq('yookassa_payment_id', object.id).maybeSingle()
  if (!payment) return res.status(200).json({ status: 'ignored', reason: 'payment not found' })

  // Уже обработан — ЮKassa может присылать один и тот же webhook повторно
  // (это официально ожидаемое поведение), settleSucceededPayment не должен
  // выполниться дважды на один и тот же платёж.
  if (payment.status === 'succeeded' || payment.status === 'canceled') {
    return res.status(200).json({ status: 'already_processed' })
  }

  let real
  try {
    real = await fetchYooKassaPayment(object.id)
  } catch (e) {
    console.error('[payments/callback] не удалось перепроверить платёж у ЮKassa', e)
    // Не подтверждаем статус, если не можем его перепроверить — ЮKassa
    // повторит webhook позже.
    return res.status(502).json({ error: 'Не удалось подтвердить платёж' })
  }

  if (real.status === 'succeeded') {
    // Атомарный переход pending -> succeeded: если строку уже перевёл в
    // succeeded параллельный вызов (повторный webhook), affected будет
    // пустым, и settleSucceededPayment не выполнится второй раз.
    const { data: updated } = await sb.from('payments')
      .update({ status: 'succeeded', paid_at: new Date().toISOString() })
      .eq('id', payment.id).eq('status', payment.status)
      .select('id')
    if (updated && updated.length > 0) {
      await settleSucceededPayment(sb, payment)
    }
  } else if (real.status === 'canceled') {
    await sb.from('payments').update({ status: 'canceled' }).eq('id', payment.id).eq('status', payment.status)
  }

  res.status(200).json({ status: 'ok' })
}
