import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res)
  if (!ctx) return

  const { rewardId, activateLater, date, comment } = req.body
  if (!rewardId) return res.status(400).json({ error: 'Нет rewardId' })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  const userId = ctx.user.id

  const { data, error: purchaseError } = await supabaseAdmin.rpc('purchase_reward', {
    p_user_id: userId,
    p_reward_id: rewardId,
    p_activate_later: !!activateLater,
    p_date: date || null,
    p_comment: comment || null
  })

  if (purchaseError) {
    const msg = purchaseError.message || 'Ошибка покупки'
    if (msg.includes('Недостаточно')) return res.status(400).json({ error: 'Недостаточно кармиков' })
    if (msg.includes('Лимит')) return res.status(400).json({ error: msg })
    if (msg.includes('Награда не найдена')) return res.status(404).json({ error: 'Награда не найдена' })
    return res.status(500).json({ error: msg })
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result) return res.status(500).json({ error: 'Пустой ответ от сервера' })

  const { new_balance: newBalance, new_status: newStatus, reward_name: rewardName } = result

  let message = `Вы приобрели "${rewardName}" за ${result.reward_cost} кармиков.`
  if (newStatus === 'new') {
    message += ' Сертификат можно активировать позже в разделе "Мои покупки".'
  } else if (newStatus === 'pending') {
    message += ' Заявка отправлена на согласование руководителю.'
  }

  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    message,
    link: '/my-purchases'
  })

  if (newStatus === 'pending') {
    const { data: profile } = await supabaseAdmin.from('profiles').select('company_id').eq('user_id', userId).single()
    if (profile?.company_id) {
      const { data: admins } = await supabaseAdmin.from('profiles').select('user_id').eq('company_id', profile.company_id).in('role_id', [1, 2])
      if (admins?.length) {
        const notifs = admins.map(a => ({
          user_id: a.user_id,
          message: `Сотрудник хочет приобрести "${rewardName}". Требуется подтверждение.`,
          link: '/company-admin/purchases'
        }))
        await supabaseAdmin.from('notifications').insert(notifs)
      }
    }
  }

  res.status(200).json({ newBalance, message })
}
