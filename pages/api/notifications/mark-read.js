import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const userId = ctx.user.id
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  await sb.from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  res.status(200).json({ success: true })
}
