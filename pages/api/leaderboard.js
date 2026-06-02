import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: balances } = await supabase
    .from('karma_balance')
    .select('user_id, balance')
    .order('balance', { ascending: false })
    .limit(20)

  if (!balances) return res.status(200).json([])

  // Получить email/имена через профили (или auth, но проще из profiles)
  const userIds = balances.map(b => b.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name, email')
    .in('user_id', userIds)

  const profileMap = {}
  profiles?.forEach(p => { profileMap[p.user_id] = p.display_name || p.email })

  const leaders = balances.map(b => ({
    user_id: b.user_id,
    balance: b.balance,
    name: profileMap[b.user_id] || 'Неизвестный'
  }))

  res.status(200).json(leaders)
}
