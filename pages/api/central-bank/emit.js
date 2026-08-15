import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Эмиссия кармиков из Центробанка в казну компании по тарифу.
// Доступ: админ своей компании или супер-админ. Сама эмиссия атомарна —
// выполняется одной SECURITY DEFINER функцией в БД (см. SQL).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  const companyId = ctx.profile?.company_id
  const isAdmin = ctx.profile?.is_company_admin || ctx.profile?.role_id === 1
  if (!companyId || !isAdmin) return res.status(403).json({ error: 'Недостаточно прав' })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await supabaseAdmin.rpc('emit_karma_to_company', { p_company_id: companyId })
  if (error) return res.status(400).json({ error: error.message })

  const result = Array.isArray(data) ? data[0] : data
  res.status(200).json({
    success: true,
    emitted: Number(result?.emitted ?? 0),
    new_company_balance: Number(result?.new_company_balance ?? 0),
    new_bank_balance: Number(result?.new_bank_balance ?? 0)
  })
}
