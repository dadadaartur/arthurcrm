import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { rewardId } = req.body
  if (!rewardId) return res.status(400).json({ error: 'Нет rewardId' })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  // Получаем токен из заголовка или кук
  let accessToken = null
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.split(' ')[1]
  }

  if (!accessToken) {
    const rawCookie = req.headers.cookie || ''
    const cookies = Object.fromEntries(
      rawCookie.split('; ').map(c => {
        const idx = c.indexOf('=')
        if (idx === -1) return [c.trim(), '']
        return [c.substring(0, idx).trim(), decodeURIComponent(c.substring(idx + 1))]
      })
    )
    const authKey = Object.keys(cookies).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
    if (authKey) {
      try {
        const parsed = JSON.parse(cookies[authKey])
        accessToken = parsed.access_token
      } catch (e) { /* ignore */ }
    }
  }

  if (!accessToken) {
    return res.status(401).json({ error: 'Не авторизован' })
  }

  const supabaseClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser(accessToken)
  if (userError || !user) return res.status(401).json({ error: 'Токен недействителен' })

  const userId = user.id

  // --- Логика покупки ---
  const { data: reward, error: rewardError } = await supabaseAdmin
    .from('rewards')
    .select('*')
    .eq('id', rewardId)
    .single()
  if (rewardError || !reward) return res.status(404).json({ error: 'Награда не найдена' })

  const { data: userBalance, error: balanceError } = await supabaseAdmin
    .from('karma_balance')
    .select('balance')
    .eq('user_id', userId)
    .single()
  if (balanceError || !userBalance || userBalance.balance < reward.cost) {
    return res.status(400).json({ error: 'Недостаточно кармиков' })
  }

  const { error: deductError } = await supabaseAdmin
    .from('karma_balance')
    .update({ balance: userBalance.balance - reward.cost })
    .eq('user_id', userId)
  if (deductError) return res.status(500).json({ error: 'Ошибка списания' })

  const { error: purchaseError } = await supabaseAdmin
    .from('purchases')
    .insert({
      user_id: userId,
      reward_name: reward.name,
      reward_id: reward.id,
      cost: reward.cost,
      status: 'new'
    })
  if (purchaseError) {
    await supabaseAdmin
      .from('karma_balance')
      .update({ balance: userBalance.balance })
      .eq('user_id', userId)
    return res.status(500).json({ error: 'Ошибка создания покупки' })
  }

  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    message: `Вы приобрели "${reward.name}" за ${reward.cost} кармиков. Для активации нажмите "Активировать" в разделе "Мои покупки".`,
    link: '/my-purchases'
  })

  res.status(200).json({ newBalance: userBalance.balance - reward.cost })
}
