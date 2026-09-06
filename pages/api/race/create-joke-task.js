import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Заявка на шуточное задание от победителя месячной гонки — требует
// подтверждения админа компании перед публикацией (не полностью
// свободное peer-to-peer, по итогам обсуждения от 6 сентября 2026).
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (req.method === 'POST') {
    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
    const { data: win } = await a.from('race_winners').select('*').eq('company_id', companyId).eq('cycle_month', prevMonth).eq('user_id', ctx.user.id).maybeSingle()
    if (!win) return res.status(403).json({ error: 'У вас нет привилегии — вы не входили в топ-3 прошлого месяца' })
    if (win.joke_tasks_used >= 2) return res.status(403).json({ error: 'Лимит шуточных заданий на этот цикл исчерпан' })

    const { title, description, targetUserIds, rewardKarma } = req.body || {}
    if (!title?.trim()) return res.status(400).json({ error: 'Укажите название' })
    if (!Array.isArray(targetUserIds) || !targetUserIds.length) return res.status(400).json({ error: 'Выберите хотя бы одного коллегу' })

    const { error } = await a.from('peer_tasks').insert({
      company_id: companyId, created_by: ctx.user.id, title: title.trim(), description: description || null,
      reward_karma: Math.max(1, Math.min(15, Number(rewardKarma) || 5)), // сознательно небольшой потолок — это шутка, не замена обычных заданий
      target_user_ids: targetUserIds, status: 'pending',
    })
    if (error) return res.status(500).json({ error: error.message })
    await a.from('race_winners').update({ joke_tasks_used: win.joke_tasks_used + 1 }).eq('id', win.id)

    // Уведомляем админов компании — есть заявка на модерацию.
    const { data: admins } = await a.from('profiles').select('user_id').eq('company_id', companyId).eq('is_company_admin', true)
    if (admins?.length) await a.from('notifications').insert(admins.map(ad => ({ user_id: ad.user_id, message: `Заявка на шуточное задание от ${ctx.profile.display_name || ctx.profile.email} — нужна модерация`, link: '/company-admin/peer-tasks' })))

    return res.status(200).json({ success: true })
  }

  const { data: mine } = await a.from('peer_tasks').select('*').eq('created_by', ctx.user.id).order('created_at', { ascending: false })
  res.status(200).json({ tasks: mine || [] })
}
