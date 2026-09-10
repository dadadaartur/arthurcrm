import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

// Доска почёта (по прямому запросу от 6 сентября 2026 — «попадание в
// доски почёта» как часть настоящей мотивационной платформы, не просто
// текущий рейтинг, а история признания). Три раздела: победители
// месячной гонки, призёры лиги по контрольным точкам, и отдельно —
// кто больше всех достиг личных целей, которые поставил себе сам.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const [{ data: raceWinners }, { data: leagueAwards }, { data: completedGoals }] = await Promise.all([
    a.from('race_winners').select('*').eq('company_id', companyId).eq('rank', 1).order('cycle_month', { ascending: false }).limit(12),
    a.from('league_checkpoint_awards').select('*, league_seasons!inner(company_id)').eq('league_seasons.company_id', companyId).eq('rank', 1).order('checkpoint_month', { ascending: false }).limit(12),
    a.from('personal_goals').select('user_id').eq('company_id', companyId).eq('status', 'completed'),
  ])

  const userIds = [...new Set([...(raceWinners || []).map(r => r.user_id), ...(leagueAwards || []).map(l => l.user_id), ...(completedGoals || []).map(g => g.user_id)])]
  const { data: profiles } = userIds.length ? await a.from('profiles').select('user_id, first_name, last_name, display_name, email, avatar_url').in('user_id', userIds) : { data: [] }
  const nameById = {}, avatarById = {}
  ;(profiles || []).forEach(p => { nameById[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || p.email; avatarById[p.user_id] = p.avatar_url })

  const goalsCountByUser = {}
  ;(completedGoals || []).forEach(g => { goalsCountByUser[g.user_id] = (goalsCountByUser[g.user_id] || 0) + 1 })
  const topGoalAchievers = Object.entries(goalsCountByUser).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([userId, count]) => ({ userId, name: nameById[userId] || '—', avatarUrl: avatarById[userId], count }))

  res.status(200).json({
    raceWinners: (raceWinners || []).map(r => ({ ...r, name: nameById[r.user_id] || '—', avatarUrl: avatarById[r.user_id] })),
    leagueChampions: (leagueAwards || []).map(l => ({ ...l, name: nameById[l.user_id] || '—', avatarUrl: avatarById[l.user_id] })),
    topGoalAchievers,
  })
}
