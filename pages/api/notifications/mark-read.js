import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { id, all } = req.body || {}
  let q = a.from('notifications').update({ is_read: true }).eq('user_id', ctx.user.id)
  if (!all && id) q = q.eq('id', id)
  const { error } = await q
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ success: true })
}
