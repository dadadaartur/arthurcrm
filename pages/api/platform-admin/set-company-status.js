import { createClient } from '@supabase/supabase-js'
import { requirePlatformStaff } from '../../../lib/auth'

const VALID_STATUSES = ['pending', 'active', 'suspended', 'rejected']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requirePlatformStaff(req, res, { permission: 'suspend_companies' })
  if (!ctx) return

  const { companyId, status, reason } = req.body
  if (!companyId || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Неверные параметры' })
  }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { error } = await supabaseAdmin
    .from('companies')
    .update({
      status,
      status_reason: reason || null,
      status_changed_by: ctx.user.id,
      status_changed_at: new Date().toISOString()
    })
    .eq('id', companyId)

  if (error) return res.status(500).json({ error: 'Ошибка обновления статуса компании' })

  await supabaseAdmin.from('audit_logs').insert({
    user_id: ctx.user.id,
    action: 'company_status_changed',
    entity_type: 'company',
    entity_id: companyId.toString(),
    details: { new_status: status, reason: reason || null }
  })

  res.status(200).json({ success: true })
}
