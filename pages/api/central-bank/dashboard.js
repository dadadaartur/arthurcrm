import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

const FOUNDER_EMAIL = 'arturgalkin.ru@mail.ru'

// Дашборд Центробанка — только для основателя.
// Возвращает: капитал, тарифы, компании с казной, журнал эмиссий,
// реальные платежи (ЮKassa), выручку по тарифам и ближайшие продления.
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

  // Компании + казна + число сотрудников
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

  // Реальные успешные платежи из ЮKassa
  const { data: payments } = await sb.from('payments')
    .select('*').eq('status', 'succeeded')
    .order('created_at', { ascending: false }).limit(100)

  const companyName = Object.fromEntries((companies || []).map(c => [c.id, c.name]))

  // Выручка: по тарифам (смены тарифа) + докупки кармиков
  const byTariff = {}
  let topup = 0
  let total = 0
  for (const p of (payments || [])) {
    const rub = Number(p.amount_rub) || 0
    total += rub
    if (p.payment_type === 'tariff_upgrade' && p.tariff_code) {
      byTariff[p.tariff_code] = (byTariff[p.tariff_code] || 0) + rub
    } else {
      topup += rub
    }
  }

  // Ближайшие продления подписок (по valid_until)
  const now = Date.now()
  const upcomingRenewals = enriched
    .filter(c => c.tariff_id && c.valid_until)
    .map(c => {
      const tariff = (tariffs || []).find(t => t.id === c.tariff_id)
      const daysLeft = Math.ceil((new Date(c.valid_until).getTime() - now) / (1000 * 60 * 60 * 24))
      const expected = tariff ? Number(tariff.price_per_employee_rub) * Math.max(c.employee_count, 1) : 0
      return {
        company_id: c.id,
        company_name: c.name,
        tariff_name: tariff?.name || '—',
        valid_until: c.valid_until,
        days_left: daysLeft,
        expected_rub: expected,
        employee_count: c.employee_count
      }
    })
    .sort((a, b) => new Date(a.valid_until) - new Date(b.valid_until))

  res.status(200).json({
    bank: bank || null,
    tariffs: tariffs || [],
    companies: enriched,
    ledger: ledger || [],
    payments: (payments || []).map(p => ({
      ...p,
      company_name: companyName[p.company_id] || `ID ${p.company_id}`
    })),
    revenue: { byTariff, topup, total },
    upcomingRenewals
  })
}
