import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res)
  if (!ctx) return

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'Service key missing' })
  }

  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey)

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('display_name, role_id, company_id, avatar_url, first_name, last_name')
    .eq('user_id', ctx.user.id)
    .maybeSingle()

  if (profileError) {
    return res.status(500).json({ error: 'Failed to load profile' })
  }

  res.status(200).json(profile || null)
}
