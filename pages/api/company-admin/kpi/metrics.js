import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../../lib/auth'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const companyId = ctx.profile?.company_id

  if (req.method === 'GET') {
    const { data } = await a.from('kpi_metrics').select('*').eq('company_id', companyId).eq('is_active', true).order('id')
    return res.status(200).json(data || [])
  }

  const isAdmin = ctx.profile?.is_company_admin || hasPermission(ctx.profile, 'can_manage_employees')
  if (!isAdmin) return res.status(403).json({ error: 'Недостаточно прав' })

  if (req.method === 'POST') {
    const b = req.body
    const { data, error } = await a.from('kpi_metrics').insert({
      company_id: companyId,
      name: String(b.name || '').slice(0, 24),
      unit: b.unit || '%',
      kpi_type: b.kpi_type || 'cumulative',
      thr_min: Number(b.thr_min) || 0, thr_mid: Number(b.thr_mid) || 0, thr_top: Number(b.thr_top) || 0, thr_ultra: Number(b.thr_ultra) || 0,
      energy_min: Number(b.energy_min) || 0, energy_mid: Number(b.energy_mid) || 0, energy_top: Number(b.energy_top) || 0, energy_ultra: Number(b.energy_ultra) || 0,
      karma_min: Number(b.karma_min) || 0, karma_mid: Number(b.karma_mid) || 0, karma_top: Number(b.karma_top) || 0, karma_ultra: Number(b.karma_ultra) || 0,
      description: b.description || null, advice: b.advice || null,
      inputs: b.inputs || null, formula: b.formula || null,
      is_active: true
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'PUT') {
    const { id, ...fields } = req.body
    if (fields.name) fields.name = String(fields.name).slice(0, 24)
    const { error } = await a.from('kpi_metrics').update(fields).eq('id', id).eq('company_id', companyId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  if (req.method === 'DELETE') {
    await a.from('kpi_metrics').update({ is_active: false }).eq('id', req.body.id).eq('company_id', companyId)
    return res.status(200).json({ success: true })
  }
  res.status(405).end()
}
