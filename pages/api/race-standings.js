import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

// Живые позиции месячной гонки (марафон ИИ-аналитика, часть 2,
// 6 сентября 2026) — по кармикам, заработанным именно в текущем
// календарном месяце (сумма положительных karma_transactions), не по
// общему балансу. Общий баланс копится годами, и тот, кто набрал его
// раньше, всегда бы побеждал независимо от того, как он работает
// прямо сейчас — гонка тогда была бы бессмысленной.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: employees } = await a.from('profiles').select('user_id, first_name, last_name, display_name, email, avatar_url')
    .eq('company_id', companyId).eq('is_company_admin', false).is('deleted_at', null)
  const empIds = (employees || []).map(e => e.user_id)
  if (!empIds.length) return res.status(200).json({ standings: [], daysLeft: 0 })

  const { data: txns } = await a.from('karma_transactions').select('user_id, amount')
    .in('user_id', empIds).gte('created_at', monthStart).gt('amount', 0)

  const earnedByUser = {}
  ;(txns || []).forEach(t => { earnedByUser[t.user_id] = (earnedByUser[t.user_id] || 0) + Number(t.amount) })

  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email
  const standings = (employees || [])
    .map(e => ({ userId: e.user_id, name: empName(e), avatarUrl: e.avatar_url || null, karmaEarned: earnedByUser[e.user_id] || 0 }))
    .sort((a, b) => b.karmaEarned - a.karmaEarned)
    .map((s, i) => ({ ...s, place: i + 1 }))

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - now.getDate()

  // Собственная привилегия шуточных заданий — только если пользователь
  // в топ-3 ПРОШЛОГО цикла (текущий ещё не завершён, наградам рано).
  let myPrivilege = null
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
  const { data: myWin } = await a.from('race_winners').select('rank, joke_tasks_used').eq('company_id', companyId).eq('cycle_month', prevMonth).eq('user_id', ctx.user.id).maybeSingle()
  if (myWin) myPrivilege = { rank: myWin.rank, jokeTasksUsed: myWin.joke_tasks_used, jokeTasksLimit: 2 }

  res.status(200).json({ standings, daysLeft, myPrivilege })
}
