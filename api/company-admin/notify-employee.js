import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Быстрое уведомление сотруднику — по кнопке из блока «Требуют
// внимания» (пункт 2 фидбека от 6 сентября 2026), без создания
// полноценного действия развития, просто напоминание от руководителя.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { userId, message } = req.body || {}
  if (!userId || !message?.trim()) return res.status(400).json({ error: 'Не хватает данных' })
  const { data: target } = await a.from('profiles').select('company_id').eq('user_id', userId).maybeSingle()
  if (target?.company_id !== companyId) return res.status(403).json({ error: 'Сотрудник не из вашей компании' })

  const { error } = await a.from('notifications').insert({ user_id: userId, message: message.trim() })
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ success: true })
}
