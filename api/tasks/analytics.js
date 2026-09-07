import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Аналитика заданий для сотрудника (вторая половина пункта 10 фидбека
// от 1 сентября): сколько начислено, сколько потеряно из-за
// невыполненных/отклонённых заданий, что можно было купить на эти
// кармики, и прогноз — сколько можно заработать за ближайшую неделю,
// если выполнить все текущие активные задания, и что на это можно
// накопить.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const userId = ctx.user.id
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: assignments } = await a.from('task_assignments')
    .select('id, status, created_at, completed_at, deadline_at, task_id, tasks(id, title, reward_karma, is_auto_goal, partner_name)')
    .eq('user_id', userId)
  const rows = (assignments || []).filter(as => as.tasks)

  const completed = rows.filter(r => r.status === 'completed')
  const lost = rows.filter(r => r.status === 'rejected' || r.status === 'missed')
  const active = rows.filter(r => ['assigned', 'in_progress', 'pending_review'].includes(r.status))

  const earnedKarma = completed.reduce((s, r) => s + (r.tasks.reward_karma || 0), 0)
  const lostKarma = lost.reduce((s, r) => s + (r.tasks.reward_karma || 0), 0)

  // По типам — куда реально приходят кармики
  const byType = { regular: 0, auto_goal: 0, partner: 0 }
  completed.forEach(r => { const ty = r.tasks.is_auto_goal ? 'auto_goal' : (r.tasks.partner_name ? 'partner' : 'regular'); byType[ty] += r.tasks.reward_karma || 0 })

  // Активные задания с дедлайном в ближайшие 7 дней — потенциал недели
  const weekAhead = new Date(Date.now() + 7 * 86400000)
  const thisWeekPotential = active
    .filter(r => !r.deadline_at || new Date(r.deadline_at) <= weekAhead)
    .reduce((s, r) => s + (r.tasks.reward_karma || 0), 0)

  const { data: bal } = await a.from('karma_balance').select('balance').eq('user_id', userId).maybeSingle()
  const currentBalance = bal?.balance || 0

  const { data: rewards } = await a.from('rewards').select('id, name, cost, image_url').eq('company_id', companyId).order('cost')
  const affordableNow = (rewards || []).filter(r => r.cost <= currentBalance)
  const bestNow = affordableNow.length ? affordableNow[affordableNow.length - 1] : null
  const forecastBalance = currentBalance + thisWeekPotential
  const affordableForecast = (rewards || []).filter(r => r.cost <= forecastBalance)
  const bestForecast = affordableForecast.length ? affordableForecast[affordableForecast.length - 1] : null
  // Мог бы купить на потерянные кармики — что было упущено буквально
  const missedReward = lostKarma > 0 ? [...(rewards || [])].reverse().find(r => r.cost <= lostKarma) : null

  res.status(200).json({
    earnedKarma, lostKarma, completedCount: completed.length, lostCount: lost.length,
    byType, currentBalance,
    bestNow: bestNow ? { name: bestNow.name, cost: bestNow.cost, image_url: bestNow.image_url } : null,
    forecast: {
      thisWeekPotential, forecastBalance,
      bestForecast: bestForecast && bestForecast.id !== bestNow?.id ? { name: bestForecast.name, cost: bestForecast.cost, image_url: bestForecast.image_url } : null,
    },
    missedReward: missedReward ? { name: missedReward.name, cost: missedReward.cost } : null,
  })
}
