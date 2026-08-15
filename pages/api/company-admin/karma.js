import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Казна компании + Центробанк для панели управления.
// Доступ: админ своей компании или супер-админ. Читаем service-role'ом.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  const companyId = ctx.profile?.company_id
  const isAdmin = ctx.profile?.is_company_admin || ctx.profile?.role_id === 1
  if (!companyId || !isAdmin) return res.status(403).json({ error: 'Недостаточно прав' })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: account } = await supabaseAdmin
    .from('company_karma_accounts').select('*').eq('company_id', companyId).maybeSingle()

  let tariff = null
  if (account?.tariff_id) {
    const { data: t } = await supabaseAdmin.from('tariffs').select('*').eq('id', account.tariff_id).maybeSingle()
    tariff = t
  }

  const { data: employees } = await supabaseAdmin
    .from('profiles')
    .select('user_id, display_name, email, first_name, last_name, karma_balance(balance)')
    .eq('company_id', companyId).is('deleted_at', null)

  const enriched = (employees || []).map(e => ({
    user_id: e.user_id,
    name: [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email || 'Без имени',
    balance: e.karma_balance?.balance ?? 0
  })).sort((a, b) => b.balance - a.balance)

  const circulation = enriched.reduce((s, e) => s + e.balance, 0)

  // Центробанк + история эмиссий именно этой компании
  const { data: centralBank } = await supabaseAdmin.from('central_bank').select('*').eq('id', 1).maybeSingle()
  const { data: emissions } = await supabaseAdmin
    .from('central_bank_ledger')
    .select('*')
    .eq('company_id', companyId)
    .eq('event_type', 'emission')
    .order('created_at', { ascending: false })
    .limit(10)

  res.status(200).json({
    account: account || null,
    tariff: tariff || null,
    employees: enriched,
    circulation,
    central_bank: centralBank || null,
    emissions: emissions || []
  })
}
