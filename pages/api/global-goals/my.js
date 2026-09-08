import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Раньше глобальные цели видел только админ, который их создавал —
// сотрудник не мог узнать о них вообще никак. Простой read-only список
// активных целей компании, отсортированный по сроку.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(200).json([])
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data } = await a.from('global_goals').select('*').eq('company_id', companyId).eq('is_active', true).order('deadline', { ascending: true, nullsFirst: false })
  res.status(200).json(data || [])
}
