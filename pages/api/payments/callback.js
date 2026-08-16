import { createClient } from '@supabase/supabase-js'

// Webhook от ЮKassa при успешном платеже.
// URL для уведомлений в личном кабинете ЮKassa:
// https://arthurcrm.vercel.app/api/payments/callback
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
  const status = object.status
  const metadata = object.metadata || {}

  const { data: payment } = await sb
    .from('payments')
    .select('*')
    .eq('yookassa_payment_id', paymentId)
    .maybeSingle()

  if (!payment) {
    return res.status(200).json({ status: 'ignored', reason: 'payment not found' })
  }

  if (event === 'payment.succeeded' || status === 'succeeded') {
    await sb.from('payments').update({
      status: 'succeeded',
      paid_at: new Date().toISOString()
    }).eq('id', payment.id)

    if (payment.payment_type === 'topup' && payment.karma_amount) {
      const karmaAmount = Number(payment.karma_amount)
      
      const { data: acc } = await sb.from('company_karma_accounts')
        .select('*').eq('company_id', payment.company_id).maybeSingle()

      if (acc) {
        // 1. Обновляем счёт компании
        await sb.from('company_karma_accounts').update({
          balance: Number(acc.balance) + karmaAmount,
          total_issued: Number(acc.total_issued || 0) + karmaAmount,
          updated_at: new Date().toISOString()
        }).eq('company_id', payment.company_id)

        // 2. Обновляем Центральный Банк (списываем из резерва)
        await sb.rpc('central_bank_issue', { amount: karmaAmount })

        // 3. Запись в леджер ЦБ
        await sb.from('central_bank_ledger').insert({
          event_type: 'topup',
          company_id: payment.company_id,
          amount: karmaAmount,
          description: `Пополнение через ЮKassa: ${payment.amount_rub} ₽ → ${karmaAmount} кармиков`
        })

        // Уведомление админам компании об успешном пополнении
        const { data: admins } = await sb.from('profiles')
          .select('user_id')
          .eq('company_id', payment.company_id)
          .or('is_company_admin.eq.true,role_id.eq.1')

        if (admins?.length) {
          const notifications = admins.map(a => ({
            user_id: a.user_id,
            message: `Фонд компании пополнен: +${payment.karma_amount} кармиков (оплата ${payment.amount_rub} ₽)`,
            link: '/company-admin/resources'
          }))
          await sb.from('notifications').insert(notifications)
        }
      }
    }

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

        // Уведомление админам о смене тарифа
        const { data: admins } = await sb.from('profiles')
          .select('user_id')
          .eq('company_id', payment.company_id)
          .or('is_company_admin.eq.true,role_id.eq.1')

        if (admins?.length) {
          const notifications = admins.map(a => ({
            user_id: a.user_id,
            message: `Тариф изменён на "${tariff.name}" (${payment.amount_rub} ₽/мес)`,
            link: '/company-admin/resources'
          }))
          await sb.from('notifications').insert(notifications)
        }
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
