import { createClient } from '@supabase/supabase-js'
import { requirePlatformStaff } from '../../../lib/auth'

// Список и назначение модераторов площадки — доступно только супер-админу
// Кармического банка (не рядовым модераторам, чтобы модератор не мог сам
// себе или коллегам выдать полные права).

export default async function handler(req, res) {
  const ctx = await requirePlatformStaff(req, res)
  if (!ctx) return
  if (!ctx.isSuperAdmin) {
    return res.status(403).json({ error: 'Только супер-админ может управлять модераторами' })
  }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('id, user_id, display_name, permissions, active, created_at')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: 'Ошибка загрузки списка модераторов' })
    return res.status(200).json(data || [])
  }

  if (req.method === 'POST') {
    const { email, displayName, permissions } = req.body
    if (!email) return res.status(400).json({ error: 'Нет email' })

    const { data: userList, error: lookupError } = await supabaseAdmin.auth.admin.listUsers()
    if (lookupError) return res.status(500).json({ error: 'Ошибка поиска пользователя' })

    const targetUser = userList.users.find(u => (u.email || '').toLowerCase() === email.toLowerCase().trim())
    if (!targetUser) {
      return res.status(404).json({ error: 'Пользователь с таким email не найден. Он должен сначала зарегистрироваться в системе.' })
    }

    const { error: upsertError } = await supabaseAdmin.from('admin_users').upsert({
      user_id: targetUser.id,
      display_name: displayName || targetUser.email,
      permissions: Array.isArray(permissions) ? permissions : [],
      active: true,
      created_by: ctx.user.id
    }, { onConflict: 'user_id' })

    if (upsertError) return res.status(500).json({ error: 'Ошибка сохранения модератора' })
    return res.status(200).json({ success: true })
  }

  if (req.method === 'DELETE') {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'Нет userId' })
    const { error } = await supabaseAdmin.from('admin_users').update({ active: false }).eq('user_id', userId)
    if (error) return res.status(500).json({ error: 'Ошибка удаления модератора' })
    return res.status(200).json({ success: true })
  }

  res.status(405).end()
}
