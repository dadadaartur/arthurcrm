import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAuth(req, res)
  if (!auth) return

  const { rewardId } = req.body

  const serviceClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Получить награду
  const { data: reward, error: rewardError } = await serviceClient
    .from('rewards')
    .select('*')
    .eq('id', rewardId)
    .single()

  if (rewardError || !reward) return res.status(404).json({ error: 'Награда не найдена' })

  // Проверить баланс
  const { data: balanceRow } = await serviceClient
    .from('karma_balance')
    .select('balance')
    .eq('user_id', auth.user.id)
    .single()

  if (!balanceRow || balanceRow.balance < reward.cost) {
    return res.status(400).json({ error: 'Недостаточно кармиков' })
  }

  // Создать покупку
  const { error: purchaseError } = await serviceClient
    .from('purchases')
    .insert({
      user_id: auth.user.id,
      reward_id: reward.id,
      reward_name: reward.name,
      cost: reward.cost,
      status: 'new'
    })

  if (purchaseError) return res.status(500).json({ error: purchaseError.message })

  // Списать баланс
  const newBalance = balanceRow.balance - reward.cost
  await serviceClient
    .from('karma_balance')
    .update({ balance: newBalance })
    .eq('user_id', auth.user.id)

  // Записать транзакцию
  await serviceClient.from('karma_transactions').insert({
    user_id: auth.user.id,
    amount: -reward.cost,
    type: 'purchase',
    description: `Покупка: ${reward.name}`
  })

  res.status(200).json({ success: true, newBalance })
}
