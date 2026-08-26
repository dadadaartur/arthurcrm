import { createClient } from '@supabase/supabase-js'

// Вызывается после того, как пользователь перешёл по ссылке-приглашению
// (Supabase magic link) и у него уже есть активная сессия. Ищет
// bookkeeping-запись в invitations по email из токена (а не из тела
// запроса — email нельзя подделать, он приходит из проверенного access
// token) и создаёт профиль сотрудника. Идемпотентно: если профиль уже
// есть, просто возвращает успех.
//
// requireAuth() из lib/auth.js здесь намеренно не используется — она
// требует существующую profiles-запись, а у нового сотрудника её как раз
// ещё нет. Токен проверяем вручную тем же способом, что и requireAuth.

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

  // ВАЖНО: handle_new_user() — триггер на auth.users — автоматически
  // создаёт ПУСТУЮ строку в profiles (company_id = null) для ЛЮБОГО
  // нового пользователя, включая тех, кого создаёт inviteUserByEmail.
  // То есть к моменту, когда приглашённый сотрудник доходит досюда,
  // "пустой" профиль уже существует — раньше код проверял просто
  // `if (existingProfile)` и считал его уже привязанным участником,
  // возвращая company_id: null и никогда не доводя приглашение до конца
  // (человек зависал на /welcome по кругу). Проверяем именно company_id,
  // а не сам факт существования строки.
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingProfile?.company_id) {
    return res.status(200).json({ status: 'already_member', companyId: existingProfile.company_id })
  }

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('email', email)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (inviteError || !invite) {
    return res.status(404).json({ status: 'no_invite' })
  }

  // ИСПРАВЛЕНО: форма приглашения (company-admin/employees.js ->
  // /api/company-admin/invite-employee) кладёт имя/фамилию/должность/
  // роль/права в invite.payload (JSONB) — а этот код читал их из
  // невуществующих верхнеуровневых invite.permissions/invite.role_id.
  // Итог был такой: любой приглашённый сотрудник получал профиль без
  // должности, без роли и вообще без единого права, что бы админ ни
  // указал при приглашении. Теперь читаем из payload — ровно то, что
  // туда реально пишется.
  const perms = invite.payload || {}

  // profiles.user_id — PRIMARY KEY. Если пустая строка от триггера уже
  // существует (existingProfile не null, просто без company_id) — нужно
  // ОБНОВИТЬ её, а не вставлять новую (иначе — ошибка дублирования
  // первичного ключа). Если строки нет вовсе — вставляем.
  const profileData = {
    company_id: invite.company_id,
    role_id: perms.roleId || null,
    email,
    display_name: [perms.firstName, perms.lastName].filter(Boolean).join(' ') || email,
    first_name: perms.firstName || null,
    last_name: perms.lastName || null,
    position_id: perms.positionId || null,
    is_company_admin: false,
    can_create_tasks: !!perms.permissions?.can_create_tasks,
    can_review_tasks: !!perms.permissions?.can_review_tasks,
    can_manage_employees: !!perms.permissions?.can_manage_employees,
    can_delete_employees: !!perms.permissions?.can_delete_employees,
    department_id: perms.departmentId || null,
    manager_id: perms.managerId || invite.created_by
  }

  const { error: profileError } = existingProfile
    ? await supabaseAdmin.from('profiles').update(profileData).eq('user_id', user.id)
    : await supabaseAdmin.from('profiles').insert({ user_id: user.id, ...profileData })

  if (profileError) {
    return res.status(500).json({ error: 'Ошибка создания профиля: ' + profileError.message })
  }

  await supabaseAdmin
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString(), invited_user_id: user.id })
    .eq('id', invite.id)

  // Конструктор архитектуры компании (п.6 ТЗ) — если это было приглашение
  // будущего руководителя отдела (назначен ещё до того, как у него был
  // аккаунт), назначаем его руководителем этого отдела теперь, когда
  // профиль уже точно существует.
  if (perms.pendingManagerDepartmentId) {
    await supabaseAdmin.from('departments').update({ manager_user_id: user.id }).eq('id', perms.pendingManagerDepartmentId).eq('company_id', invite.company_id)
  }

  res.status(200).json({ status: 'joined', companyId: invite.company_id })
}
