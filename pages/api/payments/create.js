import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  const isAdmin = ctx.profile?.is_company_admin || ctx.profile?.role_id === 1
  if (!companyId || !isAdmin) return res.status(403).json({ error: 'Недостаточно прав' })
  const { amountRub, karmaAmount, paymentType, tariffCode } = req.body
  if (!amountRub || amountRub <= 0 || !paymentType) {
    return res.status(400).json({ error: 'Не указаны параметры платежа' })
  }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const returnBase = process.env.NEXT_PUBLIC_APP_URL || 'https://arthurcrm.vercel.app'
  const description = paymentType === 'topup'
    ? `Пополнение фонда: ${karmaAmount || 0} кармиков`
    : `Переход на тариф: ${tariffCode || 'unknown'}`
  const idempotenceKey = `karma-${companyId}-${Date.now()}-${Math.random().toString(36).substring(7)}`
  // Тестовые ключи как fallback, чтобы платежи работали до настройки env
  const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID || '1438003'
  const YOOKASSA_SECRET = process.env.YOOKASSA_SECRET || 'test_-oA0sytv2DJkkaJjo-qUlLdSIJ29YAtc0NMZ4LfQsqo'
  const yookassaResponse = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotence-Key': idempotenceKey,
      'Authorization': `Basic ${Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET}`).toString('base64')}`
    },
    body: JSON.stringify({
      amount: { value: Number(amountRub).toFixed(2), currency: 'RUB' },
      confirmation: { type: 'redirect', return_url: `${returnBase}/company-admin/resources?payment=success` },
      capture: true,
      description,
      metadata: { company_id: companyId, karma_amount: karmaAmount || 0, payment_type: paymentType, tariff_code: tariffCode || '' }
    })
  })
  if (!yookassaResponse.ok) {
    const err = await yookassaResponse.json().catch(() => ({}))
    return res.status(400).json({ error: 'Ошибка ЮKassa: ' + (err.description || JSON.stringify(err)) })
  }
  const paymentData = await yookassaResponse.json()
  const { data: payment, error: dbError } = await sb.from('payments').insert({
    company_id: companyId,
    amount_rub: Number(amountRub),
    karma_amount: karmaAmount || null,
    payment_type: paymentType,
    tariff_code: tariffCode || null,
    yookassa_payment_id: paymentData.id,
    status: 'pending',
    metadata: { tariff_code: tariffCode }
  }).select().single()
  if (dbError) return res.status(500).json({ error: 'Ошибка БД: ' + dbError.message })
  res.status(200).json({ payment_id: payment.id, confirmation_url: paymentData.confirmation?.confirmation_url })
}
