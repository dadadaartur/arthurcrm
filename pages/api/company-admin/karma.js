// karma.js
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const cid = ctx.profile.company_id
  const { data: account } = await a.from('company_karma_accounts').select('*').eq('company_id', cid).maybeSingle()
  let tariff = null
  if (account?.tariff_id) { const { data: t } = await a.from('tariffs').select('*').eq('id', account.tariff_id).maybeSingle(); tariff = t }
  const { data: employees } = await a.from('profiles').select('user_id, display_name, email, first_name, last_name').eq('company_id', cid).is('deleted_at', null)
  const ids = (employees || []).map(e => e.user_id)
  let balMap = {}
  if (ids.length) { const { data: b } = await a.from('karma_balance').select('user_id, balance').in('user_id', ids); balMap = Object.fromEntries((b || []).map(x => [x.user_id, Number(x.balance) || 0])) }
  const enriched = (employees || []).map(e => ({ user_id: e.user_id, name: [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email, balance: balMap[e.user_id] ?? 0 })).sort((x, y) => y.balance - x.balance)
  const circulation = enriched.reduce((s, e) => s + e.balance, 0)
  const { data: emissions } = await a.from('central_bank_ledger').select('*').eq('company_id', cid).eq('event_type', 'emission').order('created_at', { ascending: false }).limit(10)
  const { data: allTariffs } = await a.from('tariffs').select('*').eq('is_active', true).order('karma_per_employee')
  res.status(200).json({ account: account || null, tariff, employees: enriched, circulation, emissions: emissions || [], all_tariffs: allTariffs || [] })
}
