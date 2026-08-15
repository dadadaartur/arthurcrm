import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Поиск коллег по имени/фамилии для перевода кармиков.
// Возвращает только сотрудников своей компании (без уволенных и без себя).
// Вызывается из components/TransferModal.js при вводе текста.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  if (!ctx.profile.company_id) return res.status(200).json([])

  // Чистим запрос от символов, которые ломают синтаксис фильтра .or()
  const q = (req.query.q || '').trim().replace(/[%,()]/g, ' ')
  if (!q) return res.status(200).json([])

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const pattern = `%${q}%`
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, email, display_name, first_name, last_name, avatar_url, positions(name)')
    .eq('company_id', ctx.profile.company_id)
    .is('deleted_at', null)
    .neq('user_id', ctx.user.id)
    .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},display_name.ilike.${pattern},email.ilike.${pattern}`)
    .limit(10)

  if (error) {
    console.error('[colleagues/search] ошибка', error)
    return res.status(500).json({ error: 'Ошибка поиска коллег' })
  }

  res.status(200).json((data || []).map(p => ({
    user_id: p.user_id,
    name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || p.email,
    email: p.email,
    avatar_url: p.avatar_url,
    position: p.positions?.name || null
  })))
}
