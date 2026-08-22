// resources.js
//
// РАНЬШЕ: requireAuth(req, res, {}) без permission — этот роут отдавал ещё
// больше, чем karma.js: те же балансы всех сотрудников ПЛЮС полную историю
// платежей компании (payments.select('*'), включая yookassa_payment_id и
// суммы) — тоже любому авторизованному сотруднику компании.
import { createClient } from '@supabase/supabase-js'
import { requireAuth, isCompanyAdmin, isSuperAdmin } from '../../../lib/auth'
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  if (!isCompanyAdmin(ctx.profile) && !isSuperAdmin(ctx.profile)) {
    return res.status(403).json({ error: 'Доступ только для админа компании' })
  }
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
  const { data: allTariffs } = await a.from('tariffs').select('*').eq('is_active', true).order('karma_per_employee')
  const { data: payments } = await a.from('payments').select('*').eq('company_id', cid).order('created_at', { ascending: false }).limit(20)
  res.status(200).json({ account: account || null, tariff, employees: enriched, circulation, all_tariffs: allTariffs || [], payments: payments || [] })
}
