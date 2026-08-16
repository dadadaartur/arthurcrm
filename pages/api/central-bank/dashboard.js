import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

const FOUNDER_EMAIL = 'arturgalkin.ru@mail.ru'

// Дашборд Центробанка — только для основателя платформы.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  if (ctx.user.email !== FOUNDER_EMAIL) {
    return res.status(403).json({ error: 'Доступ только для основателя платформы' })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: bank } = await sb.from('central_bank').select('*').eq('id', 1).maybeSingle()
  const { data: tariffs } = await sb.from('tariffs').select('*').eq('is_active', true)
  const { data: companies } = await sb.from('companies').select('id, name, status, created_at')

  const enriched = []
  for (const c of (companies || [])) {
    const { data: acc } = await sb.from('company_karma_accounts').select('*').eq('company_id', c.id).maybeSingle()
    const { count } = await sb.from('profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('company_id', c.id).is('deleted_at', null).eq('is_company_admin', false)
    enriched.push({
      ...c,
      balance: acc?.balance ?? 0,
      tariff_id: acc?.tariff_id ?? null,
      total_issued: acc?.total_issued ?? 0,
      valid_until: acc?.valid_until ?? null,
      employee_count: count || 0
    })
  }

  const { data: ledger } = await sb.from('central_bank_ledger')
    .select('*').order('created_at', { ascending: false }).limit(50)

  res.status(200).json({
    bank: bank || null,
    tariffs: tariffs || [],
    companies: enriched,
    ledger: ledger || []
  })
}
