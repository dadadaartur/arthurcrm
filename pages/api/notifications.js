import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const userId = ctx.user.id
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { data: notifications } = await sb
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  const unreadCount = (notifications || []).filter(n => !n.is_read).length
  res.status(200).json({
    notifications: notifications || [],
    unreadCount
  })
}
