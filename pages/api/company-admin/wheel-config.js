import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../lib/auth'

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  if (!companyId) return res.status(400).json({ error: 'У вас нет компании' })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (req.method === 'GET') {
    const { data } = await a.from('wheel_configs').select('*').eq('company_id', companyId).maybeSingle()
    return res.status(200).json(data || { company_id: companyId, enabled: false, levels_per_spin: 1, prizes: [] })
  }

  if (!ctx.profile?.is_company_admin && !hasPermission(ctx.profile, 'can_manage_employees')) return res.status(403).json({ error: 'Недостаточно прав' })

  if (req.method === 'PUT') {
    const { enabled, levels_per_spin, prizes } = req.body || {}
    if (!Array.isArray(prizes)) return res.status(400).json({ error: 'Некорректный список призов' })
    const totalWeight = prizes.reduce((s, p) => s + (Number(p.weight) || 0), 0)
    if (enabled && (prizes.length === 0 || totalWeight <= 0)) return res.status(400).json({ error: 'Добавьте хотя бы один приз с весом больше 0, чтобы включить колесо' })
    const { error } = await a.from('wheel_configs').upsert({
      company_id: companyId,
      enabled: !!enabled,
      levels_per_spin: Math.max(1, Number(levels_per_spin) || 1),
      prizes: prizes.map(p => ({ id: p.id, label: String(p.label || '').slice(0, 30), color: p.color || '#FFD700', weight: Math.max(0.1, Number(p.weight) || 1), type: p.type === 'custom' ? 'custom' : 'karma', amount: Number(p.amount) || 0, text: p.text || '' })),
      updated_at: new Date().toISOString()
    }, { onConflict: 'company_id' })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  res.status(405).end()
}
