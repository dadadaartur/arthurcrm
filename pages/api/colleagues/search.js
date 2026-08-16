import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Список/поиск коллег для перевода кармиков.
// Пустой q = все коллеги компании (для выпадающего списка при открытии).
// Скрываем email до момента выбора получателя (защита от утечки данных).
export default async function handler(req, res) {
  // Rate limiting: не более 30 запросов в минуту на IP для поиска
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const WINDOW_MS = 60 * 1000
  const MAX_REQUESTS = 30

  if (!global.rateLimitStore) global.rateLimitStore = {}
  const store = global.rateLimitStore
  if (!store[ip]) store[ip] = { count: 0, resetTime: now + WINDOW_MS }

  if (now > store[ip].resetTime) {
    store[ip] = { count: 0, resetTime: now + WINDOW_MS }
  }

  store[ip].count++
  if (store[ip].count > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Слишком много запросов. Попробуйте позже.' })
  }

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
    // Скрываем email в общем списке - показываем только при выборе для перевода
    email: null,
    avatar_url: p.avatar_url,
    position: null
  })))
}
