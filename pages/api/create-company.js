import { createClient } from '@supabase/supabase-js'

// Создаёт компанию, роль администратора и профиль пользователя одним
// серверным вызовом через service-role ключ.
//
// Почему через сервер, а не напрямую из клиента:
// если в Supabase включено подтверждение email, supabase.auth.signUp()
// не выдаёт сессию — пользователь ещё не authenticated, и клиентские
// insert() в companies/roles/profiles падают с ошибкой RLS
// ("new row violates row-level security policy"). Здесь мы обходим
// эту проблему, работая от имени service_role, которому RLS не мешает.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId, name, description, logoUrl, email } = req.body

  if (!userId || !name || !name.trim()) {
    return res.status(400).json({ error: 'Нет обязательных полей (userId, name)' })
  }
  if (!email) {
    return res.status(400).json({ error: 'Нет email пользователя' })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  // Пользователь с таким userId должен существовать в auth.users
  // (его создаёт supabase.auth.signUp на клиенте перед вызовом этого API).
  const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (authUserError || !authUser?.user) {
    return res.status(400).json({ error: 'Пользователь не найден' })
  }

  // Не даём создать вторую компанию тому, у кого уже есть профиль с company_id.
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('company_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingProfile?.company_id) {
    return res.status(409).json({ error: 'У пользователя уже есть компания' })
  }

  // 1. Компания
  const { data: company, error: compError } = await supabaseAdmin
    .from('companies')
    .insert({
      name: name.trim(),
      description: (description || '').trim(),
      logo_url: logoUrl || null
    })
    .select()
    .single()

  if (compError) {
    return res.status(500).json({ error: 'Ошибка создания компании: ' + compError.message })
  }

  // 2. Роль администратора для именно этой компании (role_id per-company,
  // хардкодить нельзя — см. lib/auth.js).
  const { data: adminRole, error: roleError } = await supabaseAdmin
    .from('roles')
    .insert({
      name: 'Администратор',
      company_id: company.id,
      is_system: false
    })
    .select()
    .single()

  if (roleError) {
    // Пытаемся не оставлять компанию-сироту без роли
    await supabaseAdmin.from('companies').delete().eq('id', company.id)
    return res.status(500).json({ error: 'Ошибка создания роли администратора: ' + roleError.message })
  }

  // 3. Профиль пользователя. Права определяются флагом is_company_admin,
  // а не конкретным role_id (см. lib/auth.js) — role_id тут только для
  // отображения названия роли в интерфейсе.
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      user_id: userId,
      company_id: company.id,
      role_id: adminRole.id,
      is_company_admin: true,
      email: email.toLowerCase().trim(),
      display_name: email
    }, { onConflict: 'user_id' })

  if (profileError) {
    await supabaseAdmin.from('roles').delete().eq('id', adminRole.id)
    await supabaseAdmin.from('companies').delete().eq('id', company.id)
    return res.status(500).json({ error: 'Ошибка привязки профиля: ' + profileError.message })
  }

  res.status(200).json({ companyId: company.id })
}
