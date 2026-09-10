import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

// Личные цели сотрудника (по запросу от 6 сентября 2026) — сотрудник
// ставит себе сам, сам же отслеживает прогресс. Промежуточные и
// глобальные, промежуточная может быть привязана к глобальной как шаг
// на пути к ней.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const userId = ctx.user.id

  if (req.method === 'POST') {
    const { goalType, parentGoalId, title, description, targetValue, targetUnit, targetDate } = req.body || {}
    if (!title?.trim()) return res.status(400).json({ error: 'Укажите название цели' })
    if (!['global', 'intermediate'].includes(goalType)) return res.status(400).json({ error: 'Неизвестный тип цели' })
    const { data, error } = await a.from('personal_goals').insert({
      user_id: userId, company_id: companyId, goal_type: goalType,
      parent_goal_id: parentGoalId || null, title: title.trim(), description: description || null,
      target_value: targetValue != null && targetValue !== '' ? Number(targetValue) : null,
      target_unit: targetUnit || null, target_date: targetDate || null,
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ goal: data })
  }

  if (req.method === 'PUT') {
    const { id, currentValue, status, title, description, targetValue, targetDate } = req.body || {}
    const { data: goal } = await a.from('personal_goals').select('user_id, goal_type, title').eq('id', id).maybeSingle()
    if (!goal || goal.user_id !== userId) return res.status(403).json({ error: 'Не ваша цель' })
    const patch = {}
    if (currentValue != null) patch.current_value = Number(currentValue)
    if (status) { patch.status = status; if (status === 'completed') patch.completed_at = new Date().toISOString() }
    if (title != null) patch.title = title.trim()
    if (description !== undefined) patch.description = description
    if (targetValue !== undefined) patch.target_value = targetValue !== '' ? Number(targetValue) : null
    if (targetDate !== undefined) patch.target_date = targetDate || null
    const { error } = await a.from('personal_goals').update(patch).eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    // Грамота — только за глобальную цель, не за промежуточную: это и
    // есть по-настоящему значимое достижение, не рядовой шаг.
    if (status === 'completed' && goal.goal_type === 'global') {
      await a.from('certificates').insert({ company_id: companyId, user_id: userId, achievement_type: 'personal_goal', title: 'Достигнута личная цель', subtitle: goal.title })
    }
    return res.status(200).json({ success: true })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    const { data: goal } = await a.from('personal_goals').select('user_id').eq('id', id).maybeSingle()
    if (!goal || goal.user_id !== userId) return res.status(403).json({ error: 'Не ваша цель' })
    await a.from('personal_goals').delete().eq('id', id)
    return res.status(200).json({ success: true })
  }

  const { data: goals } = await a.from('personal_goals').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  res.status(200).json({ goals: goals || [] })
}
