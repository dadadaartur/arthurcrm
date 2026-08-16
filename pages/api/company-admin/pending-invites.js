import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  // Rate limiting: не более 20 запросов в минуту на IP для админских endpoint'ов
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const WINDOW_MS = 60 * 1000
  const MAX_REQUESTS = 20

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

  const ctx = await requireAuth(req, res, { permission: 'can_manage_employees' })
  if (!ctx) return
  if (!ctx.profile.company_id) return res.status(200).json([])

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabaseAdmin
    .from('invitations')
    .select('id, email, status, created_at, permissions')
    .eq('company_id', ctx.profile.company_id)
    .in('status', ['pending'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[pending-invites] ошибка загрузки приглашений', error)
    return res.status(500).json({ error: 'Ошибка загрузки приглашений' })
  }
  res.status(200).json(data || [])
}
