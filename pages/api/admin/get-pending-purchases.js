import { createClient } from '@supabase/supabase-js'
import { requireAuth, ADMIN_ROLE_IDS, ROLES } from '../../../lib/auth'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, { allowedRoles: ADMIN_ROLE_IDS })
  if (!ctx) return

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  const { data: allPurchases, error } = await supabaseAdmin
    .from('purchases')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  // Админ компании (role_id 2) видит только своих сотрудников, супер-админ — всех.
  if (ctx.profile.role_id === ROLES.COMPANY_ADMIN) {
    const { data: employees } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('company_id', ctx.profile.company_id)

    const userIds = new Set((employees || []).map(e => e.user_id))
    return res.status(200).json((allPurchases || []).filter(p => userIds.has(p.user_id)))
  }

  res.status(200).json(allPurchases || [])
}
