import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Профиль компании (пункт 1 фидбека от 2 сентября 2026) — название,
// логотип, описание. Редактирует только админ компании.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (req.method === 'PUT') {
    if (!ctx.profile.is_company_admin) return res.status(403).json({ error: 'Только администратор компании может изменять профиль' })
    const { name, description, logoUrl } = req.body || {}
    const patch = {}
    if (name !== undefined) patch.name = name.trim()
    if (description !== undefined) patch.description = description
    if (logoUrl !== undefined) patch.logo_url = logoUrl
    const { error } = await a.from('companies').update(patch).eq('id', companyId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  const { data: company } = await a.from('companies').select('id, name, description, logo_url').eq('id', companyId).maybeSingle()
  res.status(200).json({ company })
}
