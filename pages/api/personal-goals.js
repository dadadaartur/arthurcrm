import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'
import { karmaFor } from '../../lib/kpi'

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
    const { data: goal } = await a.from('personal_goals').select('user_id, goal_type, title, target_unit').eq('id', id).maybeSingle()
    if (!goal || goal.user_id !== userId) return res.status(403).json({ error: 'Не ваша цель' })
    const isAutoTracked = !goal.target_unit || /карм/i.test(goal.target_unit)
    const patch = {}
    if (currentValue != null && !isAutoTracked) patch.current_value = Number(currentValue)
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

  const { data: rawGoals } = await a.from('personal_goals').select('*').eq('user_id', userId).order('created_at', { ascending: false })

  // Автоматический прогресс для целей в кармиках (по прямому фидбеку
  // от 6 сентября 2026: «чтобы выполнить личную цель, нужно заработать
  // деньги — чем выше показатели, тем выше премия, тем ближе цель» —
  // раньше сотрудник вписывал прогресс руками, а для цели вроде
  // «купить квартиру» оценить это число руками попросту невозможно,
  // отсюда и ощущение пустой заглушки). Считается один раз здесь для
  // ВСЕХ целей в кармиках сразу, не только глобальных — та же логика
  // применима и к промежуточным.
  const karmaGoals = (rawGoals || []).filter(g => g.status === 'active' && (!g.target_unit || /карм/i.test(g.target_unit)))
  const autoProgressById = {}
  if (karmaGoals.length) {
    const earliestCreated = karmaGoals.reduce((min, g) => g.created_at < min ? g.created_at : min, karmaGoals[0].created_at)
    const { data: allTxnsSinceEarliest } = await a.from('karma_transactions').select('amount, created_at').eq('user_id', userId).gt('amount', 0).gte('created_at', earliestCreated)
    for (const g of karmaGoals) {
      const earned = (allTxnsSinceEarliest || []).filter(t => t.created_at >= g.created_at).reduce((s, t) => s + Number(t.amount), 0)
      autoProgressById[g.id] = Math.round(earned)
    }
  }
  const goals = (rawGoals || []).map(g => autoProgressById[g.id] != null ? { ...g, current_value: autoProgressById[g.id], auto_tracked: true } : { ...g, auto_tracked: false })

  // Темп к глобальной цели (по видению от 6 сентября 2026: «важно
  // понимание, что конечная цель выполнима, для этого нужно сделать
  // вот это и вот это» — не абстрактная цель, а честный прогноз по
  // двум сценариям). Считаем только для целей в кармиках — для других
  // единиц (рубли и т.д.) курса конвертации нет, честнее промолчать,
  // чем выдумать курс.
  const globalKarmaGoals = (goals || []).filter(g => g.goal_type === 'global' && g.status === 'active' && g.target_value > 0 && (!g.target_unit || /карм/i.test(g.target_unit)))
  let paceById = {}
  if (globalKarmaGoals.length) {
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data: recentTxns } = await a.from('karma_transactions').select('amount, created_at').eq('user_id', userId).gt('amount', 0).gte('created_at', since)
    const daysActive = Math.max(1, Math.round((Date.now() - new Date(since)) / 86400000))
    const currentDailyRate = (recentTxns || []).reduce((s, t) => s + Number(t.amount), 0) / daysActive

    const { data: metrics } = await a.from('kpi_metrics').select('*').eq('company_id', ctx.profile.company_id).eq('is_active', true)
    let maxDailyKarma = 0
    for (const m of metrics || []) {
      const ultraKarma = karmaFor(m, 'ultra')
      if (ultraKarma > maxDailyKarma) maxDailyKarma = ultraKarma
    }
    // Консервативная оценка максимума — сумма ультра-наград по всем
    // показателям сразу столько же раз в день, сколько сейчас реально
    // вносится данных, не фантазийный потолок.
    const entriesPerDayEstimate = (recentTxns || []).length > 0 ? Math.max(1, (recentTxns.length / daysActive)) : 1
    const maxDailyRate = maxDailyKarma > 0 ? maxDailyKarma * entriesPerDayEstimate : currentDailyRate

    for (const g of globalKarmaGoals) {
      const remaining = Math.max(0, g.target_value - g.current_value)
      const currentDays = currentDailyRate > 0 ? Math.ceil(remaining / currentDailyRate) : null
      const maxDays = maxDailyRate > currentDailyRate && maxDailyRate > 0 ? Math.ceil(remaining / maxDailyRate) : null
      paceById[g.id] = { currentDays, maxDays }
    }
  }

  res.status(200).json({ goals: (goals || []).map(g => ({ ...g, pace: paceById[g.id] || null })) })
}
