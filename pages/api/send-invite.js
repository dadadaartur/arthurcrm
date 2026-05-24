// pages/api/send-invite.js
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Проверка авторизации + роль администратора (1 = суперадмин, 2 = админ компании)
  const auth = await requireAuth(req, res, { allowedRoles: [1, 2] })
  if (!auth) return

  const { email } = req.body
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' })
  }

  // Сервисный клиент для обхода RLS
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    const token = crypto.randomUUID()

    const { error: inviteError } = await serviceClient
      .from('invitations')
      .insert({
        email,
        token,
        status: 'pending',
        company_id: auth.profile.company_id,
        role_id: 3, // предположим, 3 - сотрудник
      })

    if (inviteError) throw inviteError

    console.log(`Приглашение для ${email}: https://karmabank.ru/invite?token=${token}`)
    return res.status(200).json({ success: true, message: 'Invitation created' })
  } catch (error) {
    console.error('Send invite error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
