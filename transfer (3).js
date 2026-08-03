import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
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

  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json(data || [])
}
