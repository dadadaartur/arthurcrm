import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { rewardId } = req.body
  if (!rewardId) return res.status(400).json({ error: 'Нет rewardId' })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  // Получаем токен пользователя
  let accessToken = null
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.split(' ')[1]
  }
  if (!accessToken) {
    const rawCookie = req.headers.cookie || ''
    const cookies = Object.fromEntries(rawCookie.split('; ').map(c => {
      const idx = c.indexOf('='); return idx === -1 ? [c.trim(), ''] : [c.substring(0, idx).trim(), decodeURIComponent(c.substring(idx + 1))]
    }))
    const authKey = Object.keys(cookies).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
    if (authKey) {
      try { const parsed = JSON.parse(cookies[authKey]); accessToken = parsed.access_token } catch (e) {}
    }
  }
  if (!accessToken) return res.status(401).json({ error: 'Не авторизован' })

  const supabaseClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser(accessToken)
  if (userError || !user) return res.status(401).json({ error: 'Токен недействителен' })
  const userId = user.id

  const { data: reward, error: rewardError } = await supabaseAdmin.from('rewards').select('*').eq('id', rewardId).single()
  if (rewardError || !reward) return res.status(404).json({ error: 'Награда не найдена' })

  const { data: userBalance, error: balanceError } = await supabaseAdmin.from('karma_balance').select('balance').eq('user_id', userId).single()
  if (balanceError || !userBalance || userBalance.balance < reward.cost) {
    return res.status(400).json({ error: 'Недостаточно кармиков' })
  }

  const newStatus = reward.requires_approval ? 'pending' : 'approved'
  const { error: deductError } = await supabaseAdmin.from('karma_balance').update({ balance: userBalance.balance - reward.cost }).eq('user_id', userId)
  if (deductError) return res.status(500).json({ error: 'Ошибка списания' })

  const { error: purchaseError } = await supabaseAdmin.from('purchases').insert({
    user_id: userId,
    reward_name: reward.name,
    reward_id: reward.id,
    cost: reward.cost,
    status: newStatus
  })
  if (purchaseError) {
    await supabaseAdmin.from('karma_balance').update({ balance: userBalance.balance }).eq('user_id', userId)
    return res.status(500).json({ error: 'Ошибка создания покупки' })
  }

  let message = `Вы приобрели "${reward.name}" за ${reward.cost} кармиков.`
  if (reward.requires_approval) {
    message += ' Покупка требует подтверждения руководителем.'
  }
  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    message,
    link: '/my-purchases'
  })

  if (reward.requires_approval) {
    // Уведомление админам компании
    const { data: profile } = await supabaseAdmin.from('profiles').select('company_id').eq('user_id', userId).single()
    if (profile?.company_id) {
      const { data: admins } = await supabaseAdmin.from('profiles').select('user_id').eq('company_id', profile.company_id).in('role_id', [1,2])
      if (admins?.length) {
        const notifs = admins.map(a => ({
          user_id: a.user_id,
          message: `Сотрудник хочет приобрести "${reward.name}". Требуется подтверждение.`,
          link: '/company-admin/purchases'
        }))
        await supabaseAdmin.from('notifications').insert(notifs)
      }
    }
  }

  res.status(200).json({ newBalance: userBalance.balance - reward.cost, message })
}
