import { createClient } from '@supabase/supabase-js'
import { requireAuth, isFounder } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  if (!isFounder(ctx.user)) return res.status(403).json({ error: 'Доступ только для основателя' })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const [ledger, purchases, transactions, transfers, profiles, companies] = await Promise.all([
    sb.from('central_bank_ledger').select('*').order('created_at', { ascending: false }).limit(100),
    sb.from('purchases').select('id,user_id,cost,reward_name,status,company_id,created_at').order('created_at', { ascending: false }).limit(100),
    sb.from('karma_transactions').select('id,user_id,amount,description,type,created_at').order('created_at', { ascending: false }).limit(100),
    sb.from('transfers').select('id,from_user_id,to_user_id,amount,comment,created_at').order('created_at', { ascending: false }).limit(100),
    sb.from('profiles').select('user_id,email,display_name,company_id'),
    sb.from('companies').select('id,name')
  ])

  const nameOf = id => { const p = (profiles.data || []).find(x => x.user_id === id); return p?.display_name || p?.email || '—' }
  const compOf = id => { const c = (companies.data || []).find(x => x.id === id); return c?.name || '' }
  const userComp = id => { const p = (profiles.data || []).find(x => x.user_id === id); return compOf(p?.company_id) }

  const feed = []
  ;(ledger.data || []).forEach(e => feed.push({
    id: 'L' + e.id, at: e.created_at, type: e.event_type, title: e.description,
    company: compOf(e.company_id), user: '', amount: e.amount, sign: e.amount > 0 ? '+' : ''
  }))
  ;(purchases.data || []).forEach(p => { if (p.status !== 'rejected') feed.push({
    id: 'P' + p.id, at: p.created_at, type: 'purchase', title: `Покупка: ${p.reward_name}`,
    company: compOf(p.company_id), user: nameOf(p.user_id), amount: p.cost, sign: '-'
  })})
  ;(transactions.data || []).forEach(t => feed.push({
    id: 'T' + t.id, at: t.created_at, type: t.type || 'transaction', title: t.description || 'Начисление',
    company: userComp(t.user_id), user: nameOf(t.user_id), amount: t.amount, sign: t.amount > 0 ? '+' : ''
  }))
  ;(transfers.data || []).forEach(t => feed.push({
    id: 'F' + t.id, at: t.created_at, type: 'transfer',
    title: `Перевод: ${nameOf(t.from_user_id)} → ${nameOf(t.to_user_id)}`,
    company: userComp(t.from_user_id), user: nameOf(t.from_user_id), amount: t.amount, sign: '↔'
  }))

  feed.sort((a, b) => new Date(b.at) - new Date(a.at))
  res.status(200).json(feed.slice(0, 300))
}
