import { createClient } from '@supabase/supabase-js'
import { settleSucceededPayment } from '../../../lib/paymentSettlement'

// Webhook от ЮKassa. URL в личном кабинете:
// https://arthurcrm.vercel.app/api/payments/callback
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { event, object } = req.body || {}
  if (!event || !object) return res.status(200).json({ status: 'ignored' })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: payment } = await sb.from('payments')
    .select('*').eq('yookassa_payment_id', object.id).maybeSingle()
  if (!payment) return res.status(200).json({ status: 'ignored', reason: 'payment not found' })

  if (event === 'payment.succeeded' || object.status === 'succeeded') {
    await sb.from('payments').update({
      status: 'succeeded',
      paid_at: new Date().toISOString()
    }).eq('id', payment.id)

    // Полный расчёт: компания + Центробанк + журнал + уведомления
    await settleSucceededPayment(sb, payment)
  } else if (event === 'payment.canceled' || object.status === 'canceled') {
    await sb.from('payments').update({ status: 'canceled' }).eq('id', payment.id)
  }

  res.status(200).json({ status: 'ok' })
}
