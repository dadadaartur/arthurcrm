import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../../lib/auth'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const companyId = ctx.profile?.company_id
  if (req.method === 'GET') {
    const { data } = await a.from('kpi_metrics').select('*').eq('company_id', companyId).order('id')
    return res.status(200).json(data || [])
  }
  if (!hasPermission(ctx.profile, 'can_manage_employees')) return res.status(403).json({ error: 'Недостаточно прав' })
  if (req.method === 'POST') {
    const b = { ...req.body }
    // Название короткое (до 24 символов) — детали в описание
    b.name = String(b.name || '').slice(0, 24)
    if (!b.name) return res.status(400).json({ error: 'Нет названия' })
    const { data } = await a.from('kpi_metrics').insert({ ...b, company_id: companyId }).select()
    return res.status(200).json(data?.[0])
  }
  if (req.method === 'PUT') {
    const { id, ...fields } = req.body
    if (fields.name !== undefined) fields.name = String(fields.name).slice(0, 24)
    await a.from('kpi_metrics').update(fields).eq('id', id).eq('company_id', companyId)
    return res.status(200).json({ success: true })
  }
  if (req.method === 'DELETE') {
    await a.from('kpi_metrics').delete().eq('id', req.body.id).eq('company_id', companyId)
    return res.status(200).json({ success: true })
  }
  res.status(405).end()
}
