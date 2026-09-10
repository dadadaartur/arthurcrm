import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data } = await a.from('certificates').select('*').eq('user_id', ctx.user.id).order('awarded_at', { ascending: false })
  res.status(200).json({ certificates: data || [] })
}
