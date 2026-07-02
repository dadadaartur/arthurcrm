import { createClient } from '@supabase/supabase-js'
import { requireAuth, ADMIN_ROLE_IDS } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res, { allowedRoles: ADMIN_ROLE_IDS })
  if (!ctx) return

  const { purchaseId, comment } = req.body
  if (!purchaseId) return res.status(400).json({ error: 'Нет purchaseId' })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  const { data: purchase, error: fetchError } = await supabaseAdmin
    .from('purchases')
    .select('id, user_id, reward_name, cost, status')
    .eq('id', purchaseId)
    .single()

  if (fetchError || !purchase) {
    return res.status(404).json({ error: 'Покупка не найдена' })
  }

  if (purchase.status !== 'pending') {
    return res.status(400).json({ error: 'Покупка уже обработана' })
  }

  if (ctx.profile.role_id === 2) {
    const { data: buyerProfile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('user_id', purchase.user_id)
      .single()

    if (!buyerProfile || buyerProfile.company_id !== ctx.profile.company_id) {
      return res.status(403).json({ error: 'Доступ запрещён: другая компания' })
    }
  }

  // Атомарный переход pending -> rejected: защита от повторной обработки.
  const { data: updated, error } = await supabaseAdmin
    .from('purchases')
    .update({ status: 'rejected', approved_comment: comment })
    .eq('id', purchaseId)
    .eq('status', 'pending')
    .select('id')

  if (error) return res.status(500).json({ error: error.message })
  if (!updated || updated.length === 0) {
    return res.status(409).json({ error: 'Покупка уже обработана другим запросом' })
  }

  // ВАЖНО: раньше при отклонении покупки списанные кармики НИКОГДА не
  // возвращались пользователю — это баг, а не только вопрос безопасности.
  // Возвращаем через атомарную RPC-функцию (см. supabase/migrations),
  // чтобы избежать гонки при параллельных операциях с балансом.
  const { error: refundError } = await supabaseAdmin.rpc('refund_karma_balance', {
    p_user_id: purchase.user_id,
    p_amount: purchase.cost
  })

  if (refundError) {
    // Статус уже сменился на rejected — сообщаем явно, чтобы это не потерялось молча.
    return res.status(500).json({
      error: 'Покупка отклонена, но не удалось вернуть кармики: ' + refundError.message
    })
  }

  await supabaseAdmin.from('notifications').insert({
    user_id: purchase.user_id,
    message: `Ваша покупка "${purchase.reward_name}" отклонена. Причина: ${comment || 'не указана'}. Кармики (${purchase.cost}) возвращены на баланс.`,
    link: '/my-purchases'
  })

  res.status(200).json({ success: true })
}
