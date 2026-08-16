import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Список/поиск коллег для перевода кармиков.
// Пустой q = все коллеги компании (для выпадающего списка при открытии).
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  if (!ctx.profile.company_id) return res.status(200).json([])

  const q = (req.query.q || '').trim().replace(/[%,()]/g, ' ')

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  let query = supabaseAdmin
    .from('profiles')
    .select('user_id, email, display_name, first_name, last_name, avatar_url')
    .eq('company_id', ctx.profile.company_id)
    .is('deleted_at', null)
    .neq('user_id', ctx.user.id)

  if (q) {
    const pattern = `%${q}%`
    query = query.or(`first_name.ilike.${pattern},last_name.ilike.${pattern},display_name.ilike.${pattern},email.ilike.${pattern}`)
  }

  const { data, error } = await query
    .order('first_name', { ascending: true })
    .limit(100)

  if (error) {
    console.error('[colleagues/search] ошибка', error)
    return res.status(500).json({ error: 'Ошибка поиска коллег' })
  }

  res.status(200).json((data || []).map(p => ({
    user_id: p.user_id,
    name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || p.email,
    email: p.email,
    avatar_url: p.avatar_url,
    position: null
  })))
}
