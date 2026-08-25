import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Смена тарифа компании. Для теста разных тарифных планов без SQL.
// В проде это будет привязано к биллингу; пока переключает админ компании.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  const companyId = ctx.profile?.company_id
  const isAdmin = ctx.profile?.is_company_admin || ctx.profile?.role_id === 1
  if (!companyId || !isAdmin) return res.status(403).json({ error: 'Недостаточно прав' })

  const { tariffCode } = req.body
  if (!tariffCode) return res.status(400).json({ error: 'Не указан тариф' })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: tariff } = await supabaseAdmin.from('tariffs').select('id').eq('code', tariffCode).maybeSingle()
  if (!tariff) return res.status(404).json({ error: 'Тариф не найден' })

  const { error } = await supabaseAdmin
    .from('company_karma_accounts')
    .update({ tariff_id: tariff.id, updated_at: new Date().toISOString() })
    .eq('company_id', companyId)

  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ success: true })
}
