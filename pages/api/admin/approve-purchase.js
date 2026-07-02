import { createClient } from '@supabase/supabase-js'
import { requireAuth, ADMIN_ROLE_IDS } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Раньше здесь был fetch(`${supabaseUrl}/api/admin/check-admin`) — это адрес
  // проекта Supabase, а не самого приложения, поэтому проверка всегда падала.
  // Теперь используем общий helper напрямую, без лишнего HTTP-запроса.
  const ctx = await requireAuth(req, res, { allowedRoles: ADMIN_ROLE_IDS })
  if (!ctx) return

  const { purchaseId, comment, dateOption, specificDate } = req.body
  if (!purchaseId) return res.status(400).json({ error: 'Нет purchaseId' })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  // Загружаем покупку заранее, чтобы:
  // 1) убедиться, что она вообще существует и ещё не обработана (защита от гонки);
  // 2) если это админ компании (role_id 2), а не супер-админ — проверить,
  //    что покупатель принадлежит его компании (иначе можно было одобрять
  //    чужие покупки, просто зная их id).
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

  const updateData = {
    status: 'approved',
    approved_comment: comment,
    certificate_data: {
      valid_date: dateOption === 'any' ? 'any' : specificDate,
      comment: comment
    }
  }

  // .eq('status', 'pending') в самом update — атомарная защита от повторного
  // одновременного одобрения тем же/другим админом.
  const { data: updated, error } = await supabaseAdmin
    .from('purchases')
    .update(updateData)
    .eq('id', purchaseId)
    .eq('status', 'pending')
    .select('id')

  if (error) return res.status(500).json({ error: error.message })
  if (!updated || updated.length === 0) {
    return res.status(409).json({ error: 'Покупка уже обработана другим запросом' })
  }

  await supabaseAdmin.from('notifications').insert({
    user_id: purchase.user_id,
    message: `Ваша покупка "${purchase.reward_name}" одобрена!`,
    link: '/my-purchases'
  })

  res.status(200).json({ success: true })
}
