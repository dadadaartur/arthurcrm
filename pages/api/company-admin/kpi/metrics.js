import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../../lib/auth'
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, { permission: 'can_review_tasks' })
  if (!ctx) return
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (req.method === 'GET') {
    const { data } = await sb.from('kpi_metrics').select('*').eq('company_id', ctx.profile.company_id).order('id')
    return res.status(200).json(data || [])
  }
  if (req.method === 'POST') {
    const b = req.body
    if (!b.name) return res.status(400).json({ error: 'Нет названия' })
    const { data, error } = await sb.from('kpi_metrics').insert({ ...b, company_id: ctx.profile.company_id }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }
  if (req.method === 'DELETE') {
    await sb.from('kpi_metrics').delete().eq('id', req.body.id).eq('company_id', ctx.profile.company_id)
    return res.status(200).json({ success: true })
  }
  res.status(405).end()
}
