import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Эмиссия кармиков в казну конкретной компании. Только для основателя.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  if (ctx.user.email !== 'arturgalkin.ru@mail.ru') {
    return res.status(403).json({ error: 'Только основатель' })
  }

  const { companyId } = req.body
  if (!companyId) return res.status(400).json({ error: 'companyId обязателен' })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await sb.rpc('emit_karma_to_company', { p_company_id: companyId })
  if (error) return res.status(400).json({ error: error.message })

  const result = Array.isArray(data) ? data[0] : data
  res.status(200).json({
    success: true,
    emitted: Number(result?.emitted ?? 0),
    new_company_balance: Number(result?.new_company_balance ?? 0),
    new_bank_balance: Number(result?.new_bank_balance ?? 0)
  })
}
