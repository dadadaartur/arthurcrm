import { createClient } from '@supabase/supabase-js'

// Webhook от ЮKassa. Приходит асинхронно после успешной оплаты.
// ВАЖНО: в личном кабинете ЮKassa должен быть прописан URL:
// https://ТВОЙ-ДОМЕН.vercel.app/api/payments/callback
// и выбраны события payment.succeeded, payment.canceled.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { event, object } = req.body || {}
  if (!event || !object) {
    return res.status(200).json({ status: 'ignored', reason: 'no event/object' })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const paymentId = object.id
  const status = object.status // succeeded | canceled | waiting_for_capture
  const metadata = object.metadata || {}

  // Находим платёж в нашей БД
  const { data: payment } = await sb
    .from('payments')
    .select('*')
    .eq('yookassa_payment_id', paymentId)
    .maybeSingle()

  if (!payment) {
    // Платёж не наш — игнорируем (возможно, webhook по другому магазину)
    return res.status(200).json({ status: 'ignored', reason: 'payment not found' })
  }

  if (event === 'payment.succeeded' || status === 'succeeded') {
    // Обновляем статус платежа
    await sb.from('payments').update({
      status: 'succeeded',
      paid_at: new Date().toISOString()
    }).eq('id', payment.id)

    // Пополнение фонда — зачисляем кармики в казну компании
    if (payment.payment_type === 'topup' && payment.karma_amount) {
      const { data: acc } = await sb.from('company_karma_accounts')
        .select('*').eq('company_id', payment.company_id).maybeSingle()

      if (acc) {
        await sb.from('company_karma_accounts').update({
          balance: Number(acc.balance) + Number(payment.karma_amount),
          total_issued: Number(acc.total_issued || 0) + Number(payment.karma_amount),
          updated_at: new Date().toISOString()
        }).eq('company_id', payment.company_id)

        // Записываем в журнал Центробанка (для аналитики и антифрода)
        await sb.from('central_bank_ledger').insert({
          event_type: 'topup',
          company_id: payment.company_id,
          amount: Number(payment.karma_amount),
          description: `Пополнение через ЮKassa: ${payment.amount_rub} ₽ → ${payment.karma_amount} кармиков`
        })
      }
    }

    // Смена тарифа — применяем новый тариф
    if (payment.payment_type === 'tariff_upgrade' && payment.tariff_code) {
      const { data: tariff } = await sb.from('tariffs')
        .select('*').eq('code', payment.tariff_code).maybeSingle()

      if (tariff) {
        await sb.from('company_karma_accounts').update({
          tariff_id: tariff.id,
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        }).eq('company_id', payment.company_id)

        await sb.from('central_bank_ledger').insert({
          event_type: 'tariff_change',
          company_id: payment.company_id,
          amount: 0,
          description: `Смена тарифа на "${tariff.name}" (${payment.amount_rub} ₽)`
        })
      }
    }
  } else if (event === 'payment.canceled' || status === 'canceled') {
    await sb.from('payments').update({
      status: 'canceled',
      metadata: { ...(payment.metadata || {}), cancel_reason: object.cancellation_details?.reason || 'unknown' }
    }).eq('id', payment.id)
  }

  res.status(200).json({ status: 'ok' })
}
