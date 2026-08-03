import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Новый, безопасный флоу приглашения сотрудника.
//
// Раньше (см. историю коммитов): company-admin/employees.js вставлял
// строку прямо в profiles, без user_id и без записи в invitations —
// сотрудник физически не мог войти в систему. А отдельная ветка кода в
// login.js/invite.js читала invitations.temp_password (пароль в открытом
// виде) напрямую с клиента — но эти записи никто и никогда не создавал.
//
// Теперь: используем встроенный механизм Supabase Auth
// (auth.admin.inviteUserByEmail) — он сам создаёт пользователя, генерирует
// криптографически стойкую одноразовую ссылку с ограниченным сроком жизни
// и отправляет письмо через настроенный в проекте почтовый шаблон
// "Invite user". Никакой пароль нигде в открытом виде не хранится и не
// передаётся через таблицы.
//
// Строка в invitations остаётся только как бухгалтерская запись (какая
// роль/права должны достаться этому email при первом входе) — её читает
// только сервер (service_role) в pages/api/invitations/accept.js.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res, { permission: 'can_manage_employees' })
  if (!ctx) return

  const { email, firstName, lastName, positionId, roleId, permissions } = req.body
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Нет email' })
  }
  if (!ctx.profile.company_id) {
    return res.status(400).json({ error: 'У вас нет компании' })
  }

  const normalizedEmail = email.trim().toLowerCase()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  // Не приглашаем повторно, если уже есть активный сотрудник с этим email
  // в этой же компании.
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('user_id, company_id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingProfile?.company_id) {
    return res.status(409).json({
      error: existingProfile.company_id === ctx.profile.company_id
        ? 'Этот сотрудник уже есть в вашей компании'
        : 'Этот email уже привязан к другой компании'
    })
  }

  // Закрываем предыдущие незавершённые приглашения на этот email в этой
  // компании, чтобы не плодить дубли.
  await supabaseAdmin
    .from('invitations')
    .update({ status: 'superseded' })
    .eq('email', normalizedEmail)
    .eq('company_id', ctx.profile.company_id)
    .eq('status', 'pending')

  const allowedPermissionFlags = ['can_create_tasks', 'can_review_tasks', 'can_manage_employees', 'can_delete_employees']
  const safePermissions = {}
  for (const flag of allowedPermissionFlags) {
    safePermissions[flag] = !!(permissions && permissions[flag])
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`

  const { data: inviteResult, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      redirectTo: `${siteUrl}/invite-callback`,
      data: {
        invited_by: ctx.user.id,
        company_id: ctx.profile.company_id
      }
    }
  )

  if (inviteError) {
    // Пользователь уже существует в auth.users, но без профиля/компании —
    // это нормальный случай (например, ранее ушёл из другой компании).
    // inviteUserByEmail в этом случае вернёт ошибку "already registered" —
    // для таких пользователей просто заводим bookkeeping-запись, они
    // смогут войти обычным логином/восстановлением пароля, и accept.js
    // подхватит приглашение по email при следующем входе.
    if (!/already registered|already exists/i.test(inviteError.message || '')) {
      return res.status(500).json({ error: 'Ошибка приглашения: ' + inviteError.message })
    }
  }

  const { error: insertError } = await supabaseAdmin.from('invitations').insert({
    email: normalizedEmail,
    company_id: ctx.profile.company_id,
    role_id: roleId || null,
    status: 'pending',
    permissions: { ...safePermissions, first_name: firstName || null, last_name: lastName || null, position_id: positionId || null },
    created_by: ctx.user.id,
    invited_user_id: inviteResult?.user?.id || null
  })

  if (insertError) {
    return res.status(500).json({ error: 'Ошибка сохранения приглашения: ' + insertError.message })
  }

  res.status(200).json({ success: true })
}
