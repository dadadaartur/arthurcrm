import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

// Раньше этого файла не было вообще — pages/leaderboard.js дёргал
// /api/leaderboard, который отвечал 404, поэтому таблица лидеров всегда
// была пустой ("Нет данных"), у всех пользователей, с самого начала.
//
// Через прямой клиентский запрос это не сделать: RLS на karma_balance
// разрешает читать чужой баланс только админам компании ("Admins manage
// company balance"), обычному сотруднику чужой баланс не виден. Поэтому
// нужен серверный эндпоинт на service-role, который сам ограничивает
// выборку компанией вызывающего.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  if (!ctx.profile.company_id) {
    return res.status(200).json([])
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, display_name, email, karma_balance(balance)')
    .eq('company_id', ctx.profile.company_id)
    .is('deleted_at', null)

  if (error) {
    console.error('[leaderboard] ошибка выборки', error)
    return res.status(500).json({ error: 'Ошибка загрузки рейтинга' })
  }

  const leaders = (profiles || [])
    .map(p => ({
      user_id: p.user_id,
      name: p.display_name || p.email || 'Без имени',
      balance: p.karma_balance?.balance ?? 0
    }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 50)

  res.status(200).json(leaders)
}
