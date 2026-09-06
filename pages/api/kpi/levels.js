import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../lib/auth'
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const companyId = ctx.profile?.company_id
  if (req.method === 'GET') {
    let { data } = await a.from('progress_levels').select('*').eq('company_id', companyId).order('energy_threshold')
    if (!data?.length) {
      const g = await a.from('progress_levels').select('*').is('company_id', null).order('energy_threshold')
      data = g.data
    }
    return res.status(200).json(data || [])
  }
  if (!hasPermission(ctx.profile, 'can_manage_employees')) return res.status(403).json({ error: 'Недостаточно прав' })
  if (req.method === 'POST') {
    const { name, energy_threshold, color, description } = req.body
    if (!name) return res.status(400).json({ error: 'Нет названия' })
    const { data } = await a.from('progress_levels').insert({ company_id: companyId, name, energy_threshold: Number(energy_threshold) || 0, color: color || '#FFD700', description: description || null }).select()
    return res.status(200).json(data?.[0])
  }
  if (req.method === 'PUT') {
    const { id, ...fields } = req.body
    if (fields.energy_threshold !== undefined) fields.energy_threshold = Number(fields.energy_threshold) || 0
    await a.from('progress_levels').update(fields).eq('id', id).eq('company_id', companyId)
    return res.status(200).json({ success: true })
  }
  if (req.method === 'DELETE') {
    await a.from('progress_levels').delete().eq('id', req.body.id).eq('company_id', companyId)
    return res.status(200).json({ success: true })
  }
  res.status(405).end()
}
