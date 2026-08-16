import { createClient } from '@supabase/supabase-js'

// Webhook от ЮKassa при успешном платеже
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { event, object } = req.body
  if (event !== 'payment.succeeded') {
    return res.status(200).json({ status: 'ignored' })
  }

  const paymentId = object.id
  const metadata = object.metadata

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Находим платёж в БД
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('yookassa_payment_id', paymentId)
    .single()

  if (!payment) {
    return res.status(404).json({ error: 'Платёж не найден' })
  }

  // Обновляем статус платежа
  await supabaseAdmin
    .from('payments')
    .update({ status: 'succeeded', paid_at: new Date().toISOString() })
    .eq('id', payment.id)

  // Если это пополнение баланса — начисляем кармики
  if (payment.payment_type === 'topup') {
    await supabaseAdmin
      .from('company_karma_accounts')
      .update({
        balance: supabaseAdmin.rpc('increment_balance', { 
          company_id: payment.company_id, 
          amount: payment.karma_amount 
        })
      })
      .eq('company_id', payment.company_id)
  }

  // Если это смена тарифа — обновляем тариф компании
  if (payment.payment_type === 'tariff_upgrade' && metadata.tariff_code) {
    const { data: tariff } = await supabaseAdmin
      .from('tariffs')
      .select('id')
      .eq('code', metadata.tariff_code)
      .single()

    if (tariff) {
      await supabaseAdmin
        .from('company_karma_accounts')
        .update({ 
          tariff_id: tariff.id,
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('company_id', payment.company_id)
    }
  }

  res.status(200).json({ status: 'success' })
}
