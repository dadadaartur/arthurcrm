import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'
import { bandFor, bandRankOf, BAND_LABELS } from '../../lib/kpi'

// Личная мотивация сотрудника (по запросу от 6 сентября 2026: «нужно
// продумать усилители — подсказки, что до такого-то приза осталось
// набрать столько-то, выполни это и получи вот это»). Три моста
// «сейчас → конкретная цель», плюс явная подсказка, какое доступное
// задание ближе всего закрывает разрыв — та же логика, что ИИ-аналитик
// даёт руководителю, только развёрнутая на самого сотрудника.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const userId = ctx.user.id

  const [{ data: balRow }, { data: rewards }, { data: energyRow }, levelsResult, { data: metrics }] = await Promise.all([
    a.from('karma_balance').select('balance').eq('user_id', userId).maybeSingle(),
    a.from('rewards').select('id, name, cost, image_url').eq('company_id', companyId).order('cost'),
    a.from('kpi_energy').select('energy').eq('user_id', userId).maybeSingle(),
    a.from('progress_levels').select('*').eq('company_id', companyId).order('energy_threshold'),
    a.from('kpi_metrics').select('*').eq('company_id', companyId).eq('is_active', true),
  ])
  let levels = levelsResult.data
  if (!levels?.length) {
    const g = await a.from('progress_levels').select('*').is('company_id', null).order('energy_threshold')
    levels = g.data
  }
  const balance = balRow?.balance || 0
  const energy = energyRow?.energy || 0

  // Мост 1 — ближайший недоступный товар магазина (не общий баланс, а
  // конкретное «до чего именно» и сколько именно не хватает).
  let nextReward = null
  const affordableGap = (rewards || []).filter(r => r.cost > balance).sort((x, y) => (x.cost - balance) - (y.cost - balance))[0]
  if (affordableGap) nextReward = { id: affordableGap.id, name: affordableGap.name, imageUrl: affordableGap.image_url, cost: affordableGap.cost, karmaNeeded: affordableGap.cost - balance }

  // Мост 2 — следующий уровень энергии.
  let nextLevel = null
  const upcoming = (levels || []).filter(l => l.energy_threshold > energy).sort((x, y) => x.energy_threshold - y.energy_threshold)[0]
  if (upcoming) nextLevel = { name: upcoming.name, threshold: upcoming.energy_threshold, energyNeeded: upcoming.energy_threshold - energy }

  // Мост 3 — показатель, ближе всего до следующего уровня (не самый
  // слабый в абсолютном выражении, а именно ближайший к переходу —
  // психологически это «рукой подать», сильнее мотивирует, чем
  // абстрактное «подтяни худший показатель»).
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  const { data: myEntries } = await a.from('kpi_entries').select('metric_id, value').eq('user_id', userId).gte('entry_date', monthStart)
  let closestMetric = null, closestGapPct = null
  for (const m of metrics || []) {
    const vals = (myEntries || []).filter(e => e.metric_id === m.id).map(e => Number(e.value))
    if (!vals.length) continue
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length
    const band = bandFor(avg, m)
    const rank = bandRankOf(m, band)
    if (rank >= 4) continue // уже ультра, дальше некуда
    const nextThr = rank === 0 ? m.thr_min : rank === 1 ? m.thr_mid : rank === 2 ? m.thr_top : m.thr_ultra
    const gapPct = m.kpi_type === 'inverse' ? (avg > 0 ? (avg - nextThr) / avg : null) : (nextThr > 0 ? (nextThr - avg) / nextThr : null)
    if (gapPct == null || gapPct <= 0) continue
    if (closestGapPct == null || gapPct < closestGapPct) { closestGapPct = gapPct; closestMetric = { name: m.name, unit: m.unit, current: Math.round(avg * 10) / 10, target: nextThr, nextBandLabel: BAND_LABELS[rank === 0 ? 'min' : rank === 1 ? 'mid' : rank === 2 ? 'top' : 'ultra'] } }
  }

  // Явный мостик к действию — доступное (не начатое) задание, которое
  // реальнее всего закрывает разрыв до приза: сортируем по тому, чья
  // награда ближе всего к недостающей сумме, не выбираем случайное.
  let suggestedTask = null
  if (nextReward) {
    const { data: myTasks } = await a.from('task_assignments').select('id, task_id, tasks(id, title, reward_karma)').eq('user_id', userId).eq('status', 'assigned')
    const candidates = (myTasks || []).filter(t => t.tasks?.reward_karma > 0).sort((x, y) => Math.abs(x.tasks.reward_karma - nextReward.karmaNeeded) - Math.abs(y.tasks.reward_karma - nextReward.karmaNeeded))
    if (candidates[0]) suggestedTask = { assignmentId: candidates[0].id, taskId: candidates[0].task_id, title: candidates[0].tasks.title, rewardKarma: candidates[0].tasks.reward_karma }
  }

  res.status(200).json({ balance, energy, nextReward, nextLevel, closestMetric, suggestedTask })
}
