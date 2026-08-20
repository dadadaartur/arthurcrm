import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../../lib/auth'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const isAdmin = ctx.profile?.is_company_admin || hasPermission(ctx.profile, 'can_manage_employees')

  if (req.method === 'GET') {
    const { data } = await a.from('kpi_trainings').select('*').eq('metric_id', req.query.metricId).order('sort_order')
    return res.status(200).json(data || [])
  }
  if (!isAdmin) return res.status(403).json({ error: 'Недостаточно прав' })
  if (req.method === 'POST') {
    const b = req.body || {}
    if (!b.metric_id || !b.title) return res.status(400).json({ error: 'Нет metric_id или названия' })
    const { data, error } = await a.from('kpi_trainings').insert({
      metric_id: b.metric_id, title: String(b.title).slice(0, 80), type: b.type || 'video',
      url: b.url || null, content: b.content || null, test_questions: b.test_questions || null,
      recommend_below: b.recommend_below || 'all', video_path: b.video_path || null
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }
  if (req.method === 'DELETE') {
    const { error } = await a.from('kpi_trainings').delete().eq('id', req.body?.id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }
  res.status(405).end()
}
