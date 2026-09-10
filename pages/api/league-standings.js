import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

// Позиции лиги (марафон «Чемпионат», часть 2, продолжение от
// 6 сентября 2026; переведено на энергию 6 сентября 2026) — по
// энергии, заработанной с начала текущего календарного года, та же
// логика, что у гонки месяца, просто на годовом окне и по другому
// измерению (энергия, не кармики — те же причины честности, что и в
// гонке). Плюс история промежуточных призов по контрольным точкам
// (по умолчанию — конец каждого квартала).
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const now = new Date()
  const year = now.getFullYear()
  const yearStart = new Date(year, 0, 1).toISOString()

  let { data: season } = await a.from('league_seasons').select('*').eq('company_id', companyId).eq('year', year).maybeSingle()
  if (!season) {
    const { data: created } = await a.from('league_seasons').insert({ company_id: companyId, year }).select().single()
    season = created
  }

  const { data: employees } = await a.from('profiles').select('user_id, first_name, last_name, display_name, email, avatar_url')
    .eq('company_id', companyId).eq('is_company_admin', false).is('deleted_at', null)
  const empIds = (employees || []).map(e => e.user_id)
  if (!empIds.length) return res.status(200).json({ standings: [], season, checkpointAwards: [] })

  const { data: txns } = await a.from('energy_transactions').select('user_id, amount').in('user_id', empIds).gte('created_at', yearStart)
  const earnedByUser = {}
  ;(txns || []).forEach(t => { earnedByUser[t.user_id] = (earnedByUser[t.user_id] || 0) + Number(t.amount) })

  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email
  const standings = (employees || [])
    .map(e => ({ userId: e.user_id, name: empName(e), avatarUrl: e.avatar_url || null, energyEarned: earnedByUser[e.user_id] || 0 }))
    .sort((a, b) => b.energyEarned - a.energyEarned)
    .map((s, i) => ({ ...s, place: i + 1 }))

  const { data: checkpointAwardsRaw } = await a.from('league_checkpoint_awards').select('*').eq('season_id', season.id).order('checkpoint_month').order('rank')
  const nameById = {}
  ;(employees || []).forEach(e => { nameById[e.user_id] = empName(e) })
  const checkpointAwards = (checkpointAwardsRaw || []).map(a2 => ({ ...a2, userName: nameById[a2.user_id] || '—' }))

  // Следующая контрольная точка — для честного «сколько осталось».
  const nextCheckpoint = (season.checkpoint_months || [3, 6, 9, 12]).find(m => m > now.getMonth() + 1 || (m === now.getMonth() + 1))
  const nextCheckpointDate = nextCheckpoint ? new Date(year, nextCheckpoint, 0) : null
  const daysToCheckpoint = nextCheckpointDate ? Math.max(0, Math.round((nextCheckpointDate - now) / 86400000)) : null

  res.status(200).json({ standings, season, checkpointAwards, daysToCheckpoint, nextCheckpointMonth: nextCheckpoint || null })
}
