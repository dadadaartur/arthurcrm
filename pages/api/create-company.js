import { createClient } from '@supabase/supabase-js'

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

async function resolveAuthUser(supabaseAdmin, anonClient, userId, email, accessToken) {
  if (accessToken && anonClient) {
    const { data: { user: tokenUser }, error: tokenError } = await anonClient.auth.getUser(accessToken)
    if (!tokenError && tokenUser) return tokenUser
  }

  if (userId) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (!error && user) return user
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }
  }

  if (email) {
    const normalizedEmail = email.toLowerCase().trim()
    const { data: { users = [] }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (!listError) {
      const match = users.find(u => (u.email || '').toLowerCase() === normalizedEmail)
      if (match) return match
    }
  }

  return null
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
  const accessToken = extractAccessToken(req)
  const anonClient = createClient(supabaseUrl, supabaseAnonKey)

  const authUser = await resolveAuthUser(supabaseAdmin, anonClient, userId, email, accessToken)
  if (!authUser) {
    return res.status(400).json({ error: 'Пользователь не найден' })
  }

  if (accessToken) {
    const { data: { user: tokenUser }, error: tokenError } = await anonClient.auth.getUser(accessToken)
    if (tokenError || !tokenUser) {
      return res.status(401).json({ error: 'Не авторизован' })
    }
    if (tokenUser.id !== authUser.id) {
      return res.status(403).json({ error: 'Доступ запрещён: userId не совпадает с сессией' })
    }
  } else {
    const realEmail = (authUser.email || '').toLowerCase().trim()
    if (realEmail !== email.toLowerCase().trim()) {
      return res.status(403).json({ error: 'Доступ запрещён: email не совпадает с аккаунтом' })
    }
    if (authUser.email_confirmed_at) {
      return res.status(403).json({ error: 'Требуется авторизация: подтвердите email и войдите, затем создайте компанию из личного кабинета' })
    }
    const createdAt = new Date(authUser.created_at).getTime()
    const FIFTEEN_MIN = 15 * 60 * 1000
    if (!createdAt || Date.now() - createdAt > FIFTEEN_MIN) {
      return res.status(403).json({ error: 'Требуется авторизация: пройдите вход заново' })
    }
  }

  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('company_id')
    .eq('user_id', authUser.id)
    .maybeSingle()

  if (existingProfile?.company_id) {
    return res.status(409).json({ error: 'У пользователя уже есть компания' })
  }

  const { data: company, error: compError } = await supabaseAdmin
    .from('companies')
    .insert({
      name: name.trim(),
      description: (description || '').trim(),
      logo_url: logoUrl || null,
      // Самостоятельно созданная компания не должна получать доступ сразу —
      // сначала модерация супер-админом (см. platform-admin/set-company-status.js).
      // Раньше поле не передавалось и компания уходила в дефолт 'active' —
      // модерация фактически не работала.
      status: 'pending'
    })
    .select()
    .single()

  if (compError) {
    return res.status(500).json({ error: 'Ошибка создания компании: ' + compError.message })
  }

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
    await supabaseAdmin.from('companies').delete().eq('id', company.id)
    return res.status(500).json({ error: 'Ошибка создания роли администратора: ' + roleError.message })
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      user_id: authUser.id,
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
