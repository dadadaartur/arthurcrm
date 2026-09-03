import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'
import { creditKarma } from '../../../lib/karma'

// Вращение колеса фортуны. Выбор приза — на сервере, не на клиенте: если
// бы клиент сам решал, какой приз выпал, и просто отправлял результат —
// это была бы дыра для читерства (отправить "выиграл главный приз" без
// реального вращения). Сервер сам считает результат по весам и
// возвращает его — клиент только проигрывает анимацию до уже известного
// исхода.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const companyId = ctx.profile?.company_id

  const { data: config } = await a.from('wheel_configs').select('*').eq('company_id', companyId).maybeSingle()
  if (!config?.enabled || !config.prizes?.length) return res.status(400).json({ error: 'Лента подарков не настроена' })

  const { data: profile } = await a.from('profiles').select('wheel_spins_available').eq('user_id', ctx.user.id).maybeSingle()
  if (!profile || (profile.wheel_spins_available || 0) <= 0) return res.status(400).json({ error: 'Нет доступных попыток' })

  // Взвешенный случайный выбор приза.
  const totalWeight = config.prizes.reduce((s, p) => s + (Number(p.weight) || 0), 0)
  let roll = Math.random() * totalWeight
  let prize = config.prizes[config.prizes.length - 1]
  for (const p of config.prizes) {
    roll -= Number(p.weight) || 0
    if (roll <= 0) { prize = p; break }
  }

  await a.from('profiles').update({ wheel_spins_available: profile.wheel_spins_available - 1 }).eq('user_id', ctx.user.id)

  if (prize.type === 'karma' && prize.amount > 0) {
    await creditKarma(a, { userId: ctx.user.id, amount: prize.amount, type: 'wheel_prize', description: `Приз колеса фортуны: ${prize.label}` })
  }

  await a.from('wheel_spin_history').insert({
    user_id: ctx.user.id, company_id: companyId,
    prize_label: prize.label, prize_type: prize.type, prize_value: prize.type === 'karma' ? String(prize.amount) : prize.text,
    prize_color: prize.color || null, prize_avatar_url: prize.avatar_url || null, prize_description: prize.description || null
  })

  // Структурированный учёт для того, что нужно выдать вручную — кармики
  // уже авто-зачислены строкой выше, им отдельный учёт не нужен (по
  // проверке от 2 сентября 2026: раньше «настоящий» приз лежал только в
  // тексте уведомления, ни один админ не мог посмотреть, кому и что
  // нужно выдать).
  if (prize.type !== 'karma') {
    await a.from('prize_awards').insert({
      company_id: companyId, user_id: ctx.user.id, source: 'wheel',
      label: prize.label, description: prize.text || prize.description || null,
    })
  }

  await a.from('notifications').insert({
    user_id: ctx.user.id,
    message: `Лента подарков: вам выпал приз «${prize.label}»!`,
    link: '/my-purchases'
  })

  res.status(200).json({ prizeId: prize.id, prize, spinsLeft: profile.wheel_spins_available - 1 })
}
