import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'
import { bandFor, bandRankOf, resolveThresholds, rangeValue } from '../../../lib/kpi'

// Раньше страницы заданий сотрудника не знали вообще ничего про то, что
// задание может быть авто-зачётным по цели — запрашивали только
// title/description/reward_karma. Из-за этого «Начать задание» показывался
// и там, где нажимать вообще нечего (авто-зачёт по достижению цели), и
// сотрудник не видел ни правила зачёта, ни прогресса.
//
// Этот файл раньше существовал, но нигде не вызывался (проверено —
// нет ни одной ссылки на api/tasks/my по всему проекту) — переиспользую
// то же имя вместо создания дубля с похожим смыслом.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const userId = ctx.user.id
  const today = new Date().toISOString().slice(0, 10)

  const [{ data: active }, { data: history }] = await Promise.all([
    a.from('task_assignments')
      .select('id, status, started_at, deadline_at, task_id, progress_count, tasks(id, title, description, reward_karma, image_url, is_auto_goal, auto_goal_condition, auto_metric_id, auto_target_rank, reward_type, reward_config, partner_name, requires_proof, proof_type, visual_tier, target_count, target_count_label)')
      .eq('user_id', userId).in('status', ['assigned', 'in_progress', 'pending_review']).limit(50),
    a.from('task_assignments')
      .select('id, status, comment, started_at, completed_at, task_id, tasks(id, title, reward_karma, is_auto_goal, partner_name)')
      .eq('user_id', userId).in('status', ['completed', 'rejected']).order('completed_at', { ascending: false }).limit(50),
  ])

  // Для авто-зачётных заданий — подтягиваем показатель, текущий уровень
  // сотрудника по нему и был ли уже зачёт сегодня. Без этого прогресс
  // выполнения, который вы просили показать, показать нечем.
  const autoMetricIds = [...new Set((active || []).map(a2 => a2.tasks?.auto_metric_id).filter(Boolean))]
  let metricsById = {}
  if (autoMetricIds.length) {
    const { data: metrics } = await a.from('kpi_metrics').select('*').in('id', autoMetricIds)
    metricsById = Object.fromEntries((metrics || []).map(m => [m.id, m]))
  }

  const enriched = await Promise.all((active || []).map(async assignment => {
    const t = assignment.tasks
    if (!t?.is_auto_goal || !t.auto_metric_id) return { ...assignment, autoProgress: null }
    const metric = metricsById[t.auto_metric_id]
    if (!metric) return { ...assignment, autoProgress: null }
    const { data: entries } = await a.from('kpi_entries').select('value, entry_date').eq('user_id', userId).eq('metric_id', metric.id).eq('entry_date', today)
    const rv = rangeValue(metric, entries || [])
    const currentBand = rv ? bandFor(rv.value, metric) : 'none'
    const currentRank = bandRankOf(metric, currentBand)
    const targetRank = t.auto_target_rank || 1
    const thresholds = resolveThresholds(metric)
    const targetTier = thresholds[targetRank - 1]
    const { data: grantedToday } = await a.from('task_auto_grants').select('task_id').eq('task_id', t.id).eq('user_id', userId).eq('grant_date', today).maybeSingle()
    return {
      ...assignment,
      autoProgress: {
        metricName: metric.name, unit: metric.unit,
        currentValue: rv?.value ?? 0, currentBand, currentRank,
        targetRank, targetLabel: targetTier?.label || '', targetValue: targetTier?.value ?? null,
        achievedToday: !!grantedToday,
      }
    }
  }))

  res.status(200).json({ active: enriched, history: history || [] })
}
