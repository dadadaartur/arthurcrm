import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId || !ctx.profile.is_company_admin) return res.status(403).json({ error: 'Только администратор компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const year = new Date().getFullYear()

  if (req.method === 'PUT') {
    const { checkpointMonths } = req.body || {}
    if (!Array.isArray(checkpointMonths) || !checkpointMonths.every(m => Number.isInteger(m) && m >= 1 && m <= 12)) {
      return res.status(400).json({ error: 'Месяцы должны быть числами от 1 до 12' })
    }
    let { data: season } = await a.from('league_seasons').select('id').eq('company_id', companyId).eq('year', year).maybeSingle()
    if (!season) { const { data: created } = await a.from('league_seasons').insert({ company_id: companyId, year }).select().single(); season = created }
    const { error } = await a.from('league_seasons').update({ checkpoint_months: [...new Set(checkpointMonths)].sort((x, y) => x - y) }).eq('id', season.id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  let { data: season } = await a.from('league_seasons').select('*').eq('company_id', companyId).eq('year', year).maybeSingle()
  res.status(200).json({ season: season || { checkpoint_months: [3, 6, 9, 12] } })
}
