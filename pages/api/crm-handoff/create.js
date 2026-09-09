import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { requireAuth } from '../../../lib/auth'

// Раньше access_token/refresh_token клались прямо в query-string ссылки на
// внешний CRM-домен (components/Layout.js) — они попадали в историю
// браузера, логи прокси/CDN и потенциально в Referer сторонних ресурсов.
// refresh_token фактически бессрочный ключ от аккаунта — утечка = полный
// захват аккаунта.
//
// Вместо этого: создаём одноразовый короткоживущий код, сохраняем токены
// на сервере (таблица sso_handoff_codes, доступна только service_role),
// и отдаём клиенту только сам код. Внешнее CRM-приложение должно обменять
// код на токены серверным вызовом /api/crm-handoff/exchange (см. соседний
// файл) — тогда токены никогда не попадают в URL, историю браузера или
// клиентский JS сторонней страницы напрямую через адресную строку.
//
// ВАЖНО: для полноценной работы внешний CRM (summercrm) должен быть
// доработан так, чтобы вместо чтения токенов из query-параметров он
// принимал только `?handoff=<code>` и сам (со своего бэкенда) обращался
// к этому эндпоинту. Это требует согласования с командой того проекта.
// До этой доработки ссылка временно не будет автоматически логинить в CRM —
// это осознанный компромисс: безопасность важнее сохранения дырявого UX.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res)
  if (!ctx) return

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  // Токены исходной сессии передаются в теле POST-запроса (не в URL) —
  // сам вызов идёт с клиента на наш же домен по HTTPS.
  const { accessToken, refreshToken } = req.body
  if (!accessToken || !refreshToken) {
    return res.status(400).json({ error: 'Нет токенов сессии' })
  }

  const code = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + 60 * 1000) // код живёт 60 секунд и одноразовый

  const { error } = await supabaseAdmin.from('sso_handoff_codes').insert({
    code,
    user_id: ctx.user.id,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt.toISOString(),
    used: false
  })

  if (error) {
    return res.status(500).json({ error: 'Не удалось создать код обмена: ' + error.message })
  }

  res.status(200).json({ code, expiresAt: expiresAt.toISOString() })
}
