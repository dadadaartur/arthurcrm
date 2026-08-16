import { createClient } from '@supabase/supabase-js'
import { requireAuth, canAccessCompany } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res, { permission: 'can_review_tasks' })
  if (!ctx) return

  const { purchaseId, comment, dateOption, specificDate } = req.body
  if (!purchaseId) return res.status(400).json({ error: 'Нет purchaseId' })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  const { data: purchase, error: fetchError } = await supabaseAdmin
    .from('purchases')
    .select('id, user_id, reward_name, status')
    .eq('id', purchaseId)
    .single()

  if (fetchError || !purchase) {
    return res.status(404).json({ error: 'Покупка не найдена' })
  }
  if (purchase.status !== 'pending') {
    return res.status(400).json({ error: 'Покупка уже обработана' })
  }

  const { data: buyerProfile } = await supabaseAdmin
    .from('profiles')
    .select('company_id')
    .eq('user_id', purchase.user_id)
    .single()

  if (!buyerProfile || !canAccessCompany(ctx.profile, buyerProfile.company_id)) {
    return res.status(403).json({ error: 'Доступ запрещён: другая компания' })
  }

  const updateData = {
    status: 'approved',
    approved_comment: comment,
    approved_by: ctx.user.id,
    certificate_data: {
      valid_date: dateOption === 'any' ? 'any' : specificDate,
      comment: comment
    }
  }

  const { data: updated, error } = await supabaseAdmin
    .from('purchases')
    .update(updateData)
    .eq('id', purchaseId)
    .eq('status', 'pending')
    .select('id')

  if (error) return res.status(500).json({ error: 'Ошибка одобрения покупки' })
  if (!updated || updated.length === 0) {
    return res.status(409).json({ error: 'Покупка уже обработана другим запросом' })
  }

  await supabaseAdmin.from('notifications').insert({
    user_id: purchase.user_id,
    type: 'purchase',
    message: `Ваша покупка "${purchase.reward_name}" одобрена!`,
    link: '/my-purchases'
  })

  res.status(200).json({ success: true })
}
