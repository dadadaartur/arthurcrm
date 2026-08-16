import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'
import { settleSucceededPayment } from '../../../lib/paymentSettlement'

const YOOKASSA_SHOP_ID = '1438003'
const YOOKASSA_SECRET = 'test_-oA0sytv2DJkkaJjo-qUlLdSIJ29YAtc0NMZ4LfQsqo'

// Ручная проверка статуса платежа (если webhook не дошёл).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  const companyId = ctx.profile?.company_id
  const isAdmin = ctx.profile?.is_company_admin || ctx.profile?.role_id === 1
  if (!companyId || !isAdmin) return res.status(403).json({ error: 'Недостаточно прав' })

  const { paymentId } = req.body
  if (!paymentId) return res.status(400).json({ error: 'paymentId обязателен' })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: payment } = await sb.from('payments')
    .select('*').eq('id', paymentId).eq('company_id', companyId).maybeSingle()
  if (!payment) return res.status(404).json({ error: 'Платёж не найден' })

  const yookassaResponse = await fetch(`https://api.yookassa.ru/v3/payments/${payment.yookassa_payment_id}`, {
    headers: {
      'Authorization': `Basic ${Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET}`).toString('base64')}`
    }
  })
  if (!yookassaResponse.ok) {
    const err = await yookassaResponse.json().catch(() => ({}))
    return res.status(400).json({ error: 'Ошибка ЮKassa: ' + (err.description || 'неизвестная ошибка') })
  }

  const paymentData = await yookassaResponse.json()
  const status = paymentData.status

  if (status === 'succeeded' && payment.status !== 'succeeded') {
    await sb.from('payments').update({
      status: 'succeeded',
      paid_at: paymentData.paid_at || new Date().toISOString()
    }).eq('id', payment.id)

    // Тот же полный расчёт, что и в webhook
    await settleSucceededPayment(sb, payment)

    return res.status(200).json({ success: true, message: 'Платёж оплачен, кармики зачислены, Центробанк списан', newStatus: 'succeeded' })
  }

  res.status(200).json({ success: true, message: `Статус платежа: ${status}`, newStatus: status })
}
