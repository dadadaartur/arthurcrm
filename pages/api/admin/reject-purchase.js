import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  const checkRes = await fetch(`${supabaseUrl}/api/admin/check-admin`, {
    headers: { cookie: req.headers.cookie || '' }
  })
  if (!checkRes.ok) return res.status(403).json({ error: 'Доступ запрещён' })

  const { purchaseId, comment } = req.body
  if (!purchaseId) return res.status(400).json({ error: 'Нет purchaseId' })

  const { error } = await supabaseAdmin.from('purchases').update({
    status: 'rejected',
    approved_comment: comment
  }).eq('id', purchaseId)
  if (error) return res.status(500).json({ error: error.message })

  const { data: purchase } = await supabaseAdmin.from('purchases').select('user_id, reward_name').eq('id', purchaseId).single()
  if (purchase) {
    await supabaseAdmin.from('notifications').insert({
      user_id: purchase.user_id,
      message: `Ваша покупка "${purchase.reward_name}" отклонена. Причина: ${comment || 'не указана'}.`,
      link: '/my-purchases'
    })
  }

  res.status(200).json({ success: true })
}
