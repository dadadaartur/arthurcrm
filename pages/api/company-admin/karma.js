import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Казна компании для панели управления. Доступ — только админу своей
// компании (или супер-админу). Читаем через service-role, поэтому RLS на
// company_karma_accounts не мешает серверной выборке.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  const companyId = ctx.profile?.company_id
  const isAdmin = ctx.profile?.is_company_admin || ctx.profile?.role_id === 1
  if (!companyId || !isAdmin) {
    return res.status(403).json({ error: 'Недостаточно прав' })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Казна компании
  const { data: account } = await supabaseAdmin
    .from('company_karma_accounts')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle()

  // Тариф
  let tariff = null
  if (account?.tariff_id) {
    const { data: t } = await supabaseAdmin
      .from('tariffs')
      .select('*')
      .eq('id', account.tariff_id)
      .maybeSingle()
    tariff = t
  }

  // Кто сколько накопил (балансы сотрудников компании)
  const { data: employees } = await supabaseAdmin
    .from('profiles')
    .select('user_id, display_name, email, first_name, last_name, karma_balance(balance)')
    .eq('company_id', companyId)
    .is('deleted_at', null)

  const enriched = (employees || []).map(e => ({
    user_id: e.user_id,
    name: [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email || 'Без имени',
    balance: e.karma_balance?.balance ?? 0
  })).sort((a, b) => b.balance - a.balance)

  const circulation = enriched.reduce((s, e) => s + e.balance, 0)

  res.status(200).json({
    account: account || null,
    tariff: tariff || null,
    employees: enriched,
    circulation
  })
}
