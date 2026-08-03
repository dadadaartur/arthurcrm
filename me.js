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
// Достаёт access_token из запроса тем же способом, что и lib/auth.js
// (не импортируем requireAuth напрямую, т.к. здесь легитимен случай
// ОТСУТСТВИЯ токена — signUp с включённым подтверждением email не даёт
// сессию; но если токен есть, он ОБЯЗАН совпадать с userId из тела).
function extractAccessToken(req) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1]
  }
  const rawCookie = req.headers.cookie || ''
  if (!rawCookie) return null
  const cookies = Object.fromEntries(
    rawCookie.split('; ').map(c => {
      const idx = c.indexOf('=')
      if (idx === -1) return [c.trim(), '']
      return [c.substring(0, idx).trim(), decodeURIComponent(c.substring(idx + 1))]
    })
  )
  const authKey = Object.keys(cookies).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!authKey) return null
  try {
    return JSON.parse(cookies[authKey]).access_token || null
  } catch (e) {
    return null
  }
}

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
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  // Пользователь с таким userId должен существовать в auth.users
  // (его создаёт supabase.auth.signUp на клиенте перед вызовом этого API).
  const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (authUserError || !authUser?.user) {
    return res.status(400).json({ error: 'Пользователь не найден' })
  }

  // --- Проверка личности вызывающего (закрывает уязвимость: раньше эндпоинт
  // доверял userId/email из тела запроса без всякой проверки, и любой аноним
  // мог подставить чужой userId, чтобы создать компанию и назначить
  // администратором чужой аккаунт). ---
  const accessToken = extractAccessToken(req)

  if (accessToken) {
    // Есть токен (пользователь уже вошёл в систему, email confirmation
    // отключён и signUp сразу выдал сессию, либо это уже существующий
    // залогиненный пользователь) — он ОБЯЗАН совпадать с userId из тела.
    const anonClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user: tokenUser }, error: tokenError } = await anonClient.auth.getUser(accessToken)
    if (tokenError || !tokenUser) {
      return res.status(401).json({ error: 'Не авторизован' })
    }
    if (tokenUser.id !== userId) {
      return res.status(403).json({ error: 'Доступ запрещён: userId не совпадает с сессией' })
    }
  } else {
    // Токена нет — это легитимно ТОЛЬКО сразу после signUp с включённым
    // подтверждением email (сессии ещё физически не существует). В этом
    // случае доверять userId/email от клиента нельзя напрямую — проверяем
    // это через сам объект пользователя, полученный по userId из auth.users:
    //  1) email должен совпадать с тем, что реально указан в auth.users
    //     (а не с тем, что клиент написал в отдельном поле email);
    //  2) email действительно ещё не подтверждён (иначе это не "свежий
    //     signUp", а попытка угона чужого давно существующего аккаунта);
    //  3) аккаунт создан только что (защита от угона старых "осиротевших"
    //     пользователей без профиля).
    const realEmail = (authUser.user.email || '').toLowerCase().trim()
    if (realEmail !== email.toLowerCase().trim()) {
      return res.status(403).json({ error: 'Доступ запрещён: email не совпадает с аккаунтом' })
    }
    if (authUser.user.email_confirmed_at) {
      return res.status(403).json({ error: 'Требуется авторизация: подтвердите email и войдите, затем создайте компанию из личного кабинета' })
    }
    const createdAt = new Date(authUser.user.created_at).getTime()
    const FIFTEEN_MIN = 15 * 60 * 1000
    if (!createdAt || Date.now() - createdAt > FIFTEEN_MIN) {
      return res.status(403).json({ error: 'Требуется авторизация: пройдите вход заново' })
    }
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
