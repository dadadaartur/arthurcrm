import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

const SHOP = process.env.YOOKASSA_SHOP_ID || '1438003'
const SECRET = process.env.YOOKASSA_SECRET || 'test_-oA0sytv2DJkkaJjo-qUlLdSIJ29YAtc0NMZ4LfQsqo'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const paymentId = req.query.payment_id
  if (!paymentId) return res.status(400).json({ error: 'Нет payment_id' })

  const { data: pay } = await a.from('payments').select('*').eq('id', paymentId).maybeSingle()
  if (!pay) return res.status(404).json({ error: 'Платёж не найден' })
  if (pay.status === 'succeeded') return res.status(200).json({ status: 'succeeded', already: true })

  const yr = await fetch(`https://api.yookassa.ru/v3/payments/${pay.yookassa_payment_id}`, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${SHOP}:${SECRET}`).toString('base64') }
  })
  if (!yr.ok) return res.status(500).json({ error: 'Не удалось опросить ЮKassa' })
  const y = await yr.json()
  if (y.status !== 'succeeded') return res.status(200).json({ status: y.status })

  await a.from('payments').update({ status: 'succeeded', paid_at: new Date().toISOString() }).eq('id', paymentId)
  if (pay.payment_type === 'topup' && pay.karma_amount > 0) {
    const { data: acc } = await a.from('company_karma_accounts').select('*').eq('company_id', pay.company_id).maybeSingle()
    await a.from('company_karma_accounts').upsert({ company_id: pay.company_id, balance: (acc?.balance || 0) + pay.karma_amount }, { onConflict: 'company_id' })
  }
  res.status(200).json({ status: 'succeeded' })
}
