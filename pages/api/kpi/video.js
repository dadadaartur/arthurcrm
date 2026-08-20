import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const action = req.query.action

  if (action === 'sign' && req.method === 'GET') {
    const id = req.query.id
    const { data: t } = await a.from('kpi_trainings').select('*').eq('id', id).maybeSingle()
    if (!t) return res.status(404).json({ error: 'Тренинг не найден' })
    let path = t.video_path
    if (!path && t.url) {
      const m = t.url.match(/\/object\/(?:public|sign)\/trainings\/(.+)$/)
      path = m ? m[1] : null
    }
    if (!path) return res.status(400).json({ error: 'У тренинга нет видео' })
    const { data, error } = await a.storage.from('trainings').createSignedUrl(path, 3600)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ url: data.signedUrl })
  }

  if (action === 'view' && req.method === 'POST') {
    const { training_id, watched_seconds, completed } = req.body
    await a.from('training_views').insert({ training_id, user_id: ctx.user.id, watched_seconds: watched_seconds || 0, completed: !!completed })
    return res.status(200).json({ success: true })
  }

  res.status(404).json({ error: 'Unknown action' })
}
