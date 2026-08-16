import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, { permission: 'can_manage_employees' })
  if (!ctx) return

  const { invitationId } = req.body
  if (!invitationId) return res.status(400).json({ error: 'Нет invitationId' })

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Проверяем, что приглашение принадлежит компании вызывающего — иначе
  // компания A могла бы отменить приглашение компании B, зная только id.
  const { data: invite } = await supabaseAdmin
    .from('invitations')
    .select('company_id')
    .eq('id', invitationId)
    .maybeSingle()

  if (!invite || invite.company_id !== ctx.profile.company_id) {
    return res.status(404).json({ error: 'Приглашение не найдено' })
  }

  const { error } = await supabaseAdmin
    .from('invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId)

  if (error) return res.status(500).json({ error: 'Ошибка отмены приглашения' })
  res.status(200).json({ success: true })
}
