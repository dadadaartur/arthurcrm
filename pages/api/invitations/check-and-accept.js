import { createClient } from '@supabase/supabase-js'

// Используется welcome.js: пользователь уже вошёл в систему (например,
// восстановил пароль обычным способом, а не через ссылку-приглашение), но
// у него ещё нет профиля. Проверяем, есть ли для его email ожидающее
// приглашение, и если да — сразу принимаем его (та же логика, что и
// invite-callback → accept.js, вынесена сюда, чтобы не дублировать код
// прямого доступа к invitations на клиенте).

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  const authHeader = req.headers.authorization
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
  if (!accessToken) return res.status(401).json({ error: 'Не авторизован' })

  const anonClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: userError } = await anonClient.auth.getUser(accessToken)
  if (userError || !user) return res.status(401).json({ error: 'Токен недействителен' })

  const email = (user.email || '').toLowerCase().trim()

  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingProfile) {
    return res.status(200).json({ status: 'already_member', companyId: existingProfile.company_id })
  }

  const { data: invite } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('email', email)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!invite) return res.status(200).json({ status: 'no_invite' })

  const perms = invite.permissions || {}

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    user_id: user.id,
    company_id: invite.company_id,
    role_id: invite.role_id,
    email,
    display_name: [perms.first_name, perms.last_name].filter(Boolean).join(' ') || email,
    first_name: perms.first_name || null,
    last_name: perms.last_name || null,
    position_id: perms.position_id || null,
    is_company_admin: false,
    can_create_tasks: !!perms.can_create_tasks,
    can_review_tasks: !!perms.can_review_tasks,
    can_manage_employees: !!perms.can_manage_employees,
    can_delete_employees: !!perms.can_delete_employees,
    manager_id: invite.created_by
  })

  if (profileError) {
    return res.status(500).json({ error: 'Ошибка создания профиля: ' + profileError.message })
  }

  await supabaseAdmin
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString(), invited_user_id: user.id })
    .eq('id', invite.id)

  res.status(200).json({ status: 'joined', companyId: invite.company_id })
}
