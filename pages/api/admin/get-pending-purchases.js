import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  // Проверяем права (используем тот же check-admin через внутренний вызов)
  const checkRes = await fetch(`${supabaseUrl}/api/admin/check-admin`, {
    headers: { cookie: req.headers.cookie || '' }
  })
  if (!checkRes.ok) return res.status(403).json({ error: 'Доступ запрещён' })

  const { profile } = await checkRes.json()

  // Загружаем все pending‑покупки
  const { data: allPurchases, error } = await supabaseAdmin
    .from('purchases')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  // Фильтруем по компании, если админ компании (не суперадмин)
  if (profile.role_id === 2) {
    const { data: employees } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('company_id', profile.company_id)

    const userIds = (employees || []).map(e => e.user_id)
    const filtered = allPurchases.filter(p => userIds.includes(p.user_id))
    return res.status(200).json(filtered)
  }

  // Суперадмин видит все
  res.status(200).json(allPurchases || [])
}
