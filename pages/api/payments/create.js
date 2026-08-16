import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Создание платежа через ЮKassa для покупки кармиков или смены тарифа
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  const companyId = ctx.profile?.company_id
  const isAdmin = ctx.profile?.is_company_admin || ctx.profile?.role_id === 1
  if (!companyId || !isAdmin) return res.status(403).json({ error: 'Недостаточно прав' })

  const { amountRub, karmaAmount, paymentType, tariffCode } = req.body
  if (!amountRub || !karmaAmount || !paymentType) {
    return res.status(400).json({ error: 'Не указаны параметры платежа' })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Создаём платёж в ЮKassa
  const yookassaResponse = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotence-Key': `karma-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      'Authorization': `Basic ${Buffer.from('447003:test_oA0sytv2DJkkaJjo-qUlLdSIJ29YAtc0NMZ4LfQsqo').toString('base64')}`
    },
    body: JSON.stringify({
      amount: { value: amountRub.toFixed(2), currency: 'RUB' },
      confirmation: {
        type: 'redirect',
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/company-admin/resources?payment=success`
      },
      capture: true,
      description: paymentType === 'topup' 
        ? `Пополнение баланса: ${karmaAmount} кармиков`
        : `Переход на тариф: ${tariffCode}`,
      metadata: {
        company_id: companyId,
        karma_amount: karmaAmount,
        payment_type: paymentType,
        tariff_code: tariffCode || null
      }
    })
  })

  if (!yookassaResponse.ok) {
    const error = await yookassaResponse.json()
    return res.status(400).json({ error: 'Ошибка создания платежа: ' + (error.description || 'неизвестная ошибка') })
  }

  const paymentData = await yookassaResponse.json()

  // Сохраняем платёж в БД
  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .insert({
      company_id: companyId,
      amount_rub: amountRub,
      karma_amount: karmaAmount,
      payment_type: paymentType,
      yookassa_payment_id: paymentData.id,
      status: 'pending',
      metadata: { tariff_code: tariffCode }
    })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: 'Ошибка сохранения платежа: ' + error.message })
  }

  res.status(200).json({
    payment_id: payment.id,
    confirmation_url: paymentData.confirmation.confirmation_url
  })
}
