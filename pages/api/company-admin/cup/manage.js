import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../../lib/auth'

// Управление кубком (марафон «Чемпионат», часть 2, продолжение от
// 6 сентября 2026) — создание турнира и запуск сетки. Размер сетки и
// длительность раунда настраиваются под конкретную компанию, как и
// просили — маленькой команде подойдёт сетка на 4, большой — на 16-32.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId || !ctx.profile.is_company_admin) return res.status(403).json({ error: 'Только администратор компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (req.method === 'POST') {
    const { title, bracketSize, roundDurationDays, participantIds } = req.body || {}
    if (![4, 8, 16, 32].includes(Number(bracketSize))) return res.status(400).json({ error: 'Размер сетки — 4, 8, 16 или 32' })
    if (!Array.isArray(participantIds) || participantIds.length < 2) return res.status(400).json({ error: 'Нужно минимум 2 участника' })
    if (participantIds.length > bracketSize) return res.status(400).json({ error: `Участников больше, чем мест в сетке (${bracketSize})` })

    const { data: existing } = await a.from('cup_tournaments').select('id').eq('company_id', companyId).in('status', ['seeding', 'active']).limit(1)
    if (existing?.length) return res.status(400).json({ error: 'Уже есть активный кубок — дождитесь его завершения или отмените' })

    const { data: tournament, error } = await a.from('cup_tournaments').insert({
      company_id: companyId, title: title || 'Кубок месяца', bracket_size: Number(bracketSize),
      round_duration_days: Math.max(1, Number(roundDurationDays) || 7), created_by: ctx.user.id,
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })

    // Случайное распределение по сетке — честная жеребьёвка, не по алфавиту/стажу.
    const shuffled = [...participantIds].sort(() => Math.random() - 0.5)
    await a.from('cup_participants').insert(shuffled.map((userId, i) => ({ tournament_id: tournament.id, user_id: userId, seed: i + 1 })))

    // Первый раунд — пары по порядку жеребьёвки. Если участников
    // меньше, чем мест в сетке, недостающие — технический проход
    // (participant_b = null) для верхних по номеру сеяных.
    const slots = [...shuffled]
    while (slots.length < bracketSize) slots.push(null)
    const matches = []
    for (let i = 0; i < bracketSize / 2; i++) {
      const pA = slots[i * 2], pB = slots[i * 2 + 1]
      matches.push({ tournament_id: tournament.id, round: 1, match_index: i, participant_a: pA, participant_b: pB, status: pA && pB ? 'active' : 'completed', winner_id: pA && !pB ? pA : !pA && pB ? pB : null })
    }
    await a.from('cup_matches').insert(matches)
    await a.from('cup_tournaments').update({ status: 'active', current_round: 1, round_started_at: new Date().toISOString() }).eq('id', tournament.id)
    await a.from('notifications').insert(shuffled.map(userId => ({ user_id: userId, message: `Вы участвуете в турнире «${title || 'Кубок месяца'}»! Первый раунд уже идёт.`, link: '/championship' })))

    return res.status(200).json({ success: true, tournamentId: tournament.id })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    await a.from('cup_tournaments').update({ status: 'cancelled' }).eq('id', id).eq('company_id', companyId)
    return res.status(200).json({ success: true })
  }

  const { data: employees } = await a.from('profiles').select('user_id, first_name, last_name, display_name, email').eq('company_id', companyId).eq('is_company_admin', false).is('deleted_at', null)
  res.status(200).json({ employees: employees || [] })
}
