import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: tournament } = await a.from('cup_tournaments').select('*').eq('company_id', companyId).in('status', ['active', 'completed']).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!tournament) return res.status(200).json({ tournament: null })

  const { data: matches } = await a.from('cup_matches').select('*').eq('tournament_id', tournament.id).order('round').order('match_index')
  const userIds = [...new Set((matches || []).flatMap(m => [m.participant_a, m.participant_b]).filter(Boolean))]
  const { data: profiles } = userIds.length ? await a.from('profiles').select('user_id, first_name, last_name, display_name, email').in('user_id', userIds) : { data: [] }
  const nameById = {}
  ;(profiles || []).forEach(p => { nameById[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || p.email })

  const roundEnd = tournament.round_started_at ? new Date(new Date(tournament.round_started_at).getTime() + tournament.round_duration_days * 86400000) : null
  const daysLeftInRound = roundEnd ? Math.max(0, Math.ceil((roundEnd - new Date()) / 86400000)) : null

  res.status(200).json({
    tournament, daysLeftInRound,
    matches: (matches || []).map(m => ({ ...m, nameA: nameById[m.participant_a] || (m.participant_a ? '—' : 'Свободное место'), nameB: nameById[m.participant_b] || (m.participant_b ? '—' : 'Свободное место') })),
  })
}
