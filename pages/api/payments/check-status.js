import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'
import { settleSucceededPayment } from '../../../lib/paymentSettlement'
import { fetchYooKassaPayment } from '../../../lib/yookassa'

// РАНЬШЕ: этот файл после подтверждения платежа зачислял кармики компании
// ВРУЧНУЮ, отдельной, урезанной копией логики — она не обрабатывала
// paymentType === 'tariff_upgrade' вообще (апгрейд тарифа не применялся,
// хотя деньги были списаны) и не списывала сумму с central_bank / не писала
// в central_bank_ledger (расходилась бухгалтерия с webhook-путём). Теперь
// оба пути (webhook и эта ручная проверка) вызывают одну и ту же
// settleSucceededPayment из lib/paymentSettlement.js.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const paymentId = req.query.payment_id
  if (!paymentId) return res.status(400).json({ error: 'Нет payment_id' })

  const { data: pay } = await a.from('payments').select('*').eq('id', paymentId).maybeSingle()
  if (!pay) return res.status(404).json({ error: 'Платёж не найден' })
  // Платёж должен принадлежать компании вызывающего (иначе можно было бы
  // опрашивать чужие payment_id, они не секретны сами по себе, но незачем
  // отдавать статус чужого платежа).
  if (!ctx.profile?.company_id || pay.company_id !== ctx.profile.company_id) {
    return res.status(403).json({ error: 'Нет доступа к этому платежу' })
  }
  if (pay.status === 'succeeded') return res.status(200).json({ status: 'succeeded', already: true })

  let y
  try {
    y = await fetchYooKassaPayment(pay.yookassa_payment_id)
  } catch (e) {
    console.error('[payments/check-status] ошибка опроса ЮKassa', e)
    return res.status(502).json({ error: 'Не удалось опросить ЮKassa' })
  }
  if (y.status !== 'succeeded') return res.status(200).json({ status: y.status })

  // Атомарный переход pending -> succeeded, как и в webhook — если статус
  // уже сменил параллельный запрос (например, подоспевший webhook),
  // settleSucceededPayment не выполнится повторно.
  const { data: updated } = await a.from('payments')
    .update({ status: 'succeeded', paid_at: new Date().toISOString() })
    .eq('id', paymentId).eq('status', pay.status)
    .select('id')
  if (updated && updated.length > 0) {
    await settleSucceededPayment(a, pay)
  }

  res.status(200).json({ status: 'succeeded' })
}
