import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { rewardId } = req.body
  if (!rewardId) return res.status(400).json({ error: 'Нет rewardId' })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  const supabaseClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: { session } } = await supabaseClient.auth.getSession()
  if (!session) return res.status(401).json({ error: 'Не авторизован' })

  const userId = session.user.id

  // Получаем информацию о награде
  const { data: reward, error: rewardError } = await supabaseAdmin
    .from('rewards')
    .select('*')
    .eq('id', rewardId)
    .single()
  if (rewardError || !reward) return res.status(404).json({ error: 'Награда не найдена' })

  // Проверяем баланс пользователя
  const { data: userBalance, error: balanceError } = await supabaseAdmin
    .from('karma_balance')
    .select('balance')
    .eq('user_id', userId)
    .single()
  if (balanceError || !userBalance || userBalance.balance < reward.cost) {
    return res.status(400).json({ error: 'Недостаточно кармиков' })
  }

  // Списываем кармики
  const { error: deductError } = await supabaseAdmin
    .from('karma_balance')
    .update({ balance: userBalance.balance - reward.cost })
    .eq('user_id', userId)
  if (deductError) return res.status(500).json({ error: 'Ошибка списания' })

  // Создаём запись о покупке
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
    // Возвращаем кармики
    await supabaseAdmin
      .from('karma_balance')
      .update({ balance: userBalance.balance })
      .eq('user_id', userId)
    return res.status(500).json({ error: 'Ошибка создания покупки' })
  }

  // Уведомление
  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    message: `Вы приобрели "${reward.name}" за ${reward.cost} кармиков. Для активации нажмите "Активировать" в разделе "Мои покупки".`,
    link: '/my-purchases'
  })

  res.status(200).json({ newBalance: userBalance.balance - reward.cost })
}
