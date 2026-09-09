import { createClient } from '@supabase/supabase-js'

// Вызывается СЕРВЕРОМ внешнего CRM-приложения (не браузером пользователя),
// один раз, с секретным заголовком, чтобы обменять одноразовый код на
// access/refresh токены. Код одноразовый и живёт 60 секунд — если его
// перехватят из логов, он уже будет недействителен к моменту использования.
//
// Настройте CRM_HANDOFF_SECRET в переменных окружения обоих приложений —
// это общий секрет между ArthurCRM и summercrm, отдельный от anon/service
// ключей Supabase.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const secret = req.headers['x-handoff-secret']
  if (!secret || secret !== process.env.CRM_HANDOFF_SECRET) {
    return res.status(401).json({ error: 'Неверный секрет' })
  }

  const { code } = req.body
  if (!code) return res.status(400).json({ error: 'Нет кода' })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  const { data: row, error } = await supabaseAdmin
    .from('sso_handoff_codes')
    .select('*')
    .eq('code', code)
    .eq('used', false)
    .single()

  if (error || !row) {
    return res.status(404).json({ error: 'Код недействителен или уже использован' })
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(410).json({ error: 'Код истёк' })
  }

  // Помечаем код использованным немедленно (одноразовость), затем отдаём
  // токены. Если два запроса пришли одновременно — только один пройдёт
  // условие eq('used', false) в UPDATE.
  const { data: updated } = await supabaseAdmin
    .from('sso_handoff_codes')
    .update({ used: true })
    .eq('code', code)
    .eq('used', false)
    .select('id')

  if (!updated || updated.length === 0) {
    return res.status(409).json({ error: 'Код уже использован' })
  }

  res.status(200).json({
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    userId: row.user_id
  })
}
