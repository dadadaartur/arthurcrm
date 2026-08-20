import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { recipients, message, link, type } = req.body || {}
  if (!message) return res.status(400).json({ error: 'Нет текста уведомления' })
  const ids = Array.isArray(recipients) ? recipients.filter(Boolean) : [recipients].filter(Boolean)
  if (!ids.length) return res.status(400).json({ error: 'Нет получателей' })
  const { error } = await a.from('notifications').insert(ids.map(id => ({ user_id: id, message, link: link || null, type: type || 'info' })))
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ success: true })
}
