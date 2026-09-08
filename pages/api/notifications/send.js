import { createClient } from '@supabase/supabase-js'
import { requireAuth, isCompanyAdmin, isSuperAdmin } from '../../../lib/auth'

// РАНЬШЕ: requireAuth(req, res, {}) без permission, а recipients принимались
// как есть — любой авторизованный сотрудник (любой компании) мог отправить
// произвольный текст и произвольную ссылку любому user_id в системе, включая
// сотрудников чужих компаний. Похоже, что сейчас этот роут не вызывается ни
// с одной страницы фронтенда — но он остаётся живым HTTP-эндпоинтом, так что
// это не снижает риск. Теперь: (1) только админ компании/супер-админ,
// (2) получатели фильтруются до сотрудников СВОЕЙ компании.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  if (!isCompanyAdmin(ctx.profile) && !isSuperAdmin(ctx.profile)) {
    return res.status(403).json({ error: 'Недостаточно прав для рассылки уведомлений' })
  }
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { recipients, message, link, type } = req.body || {}
  if (!message) return res.status(400).json({ error: 'Нет текста уведомления' })
  // Ссылка должна вести внутрь приложения, а не на произвольный внешний URL —
  // иначе уведомление можно было использовать как фишинговый вектор от имени
  // доверенного интерфейса платформы.
  if (link && !link.startsWith('/')) {
    return res.status(400).json({ error: 'Ссылка должна быть внутренним путём' })
  }
  const requestedIds = Array.isArray(recipients) ? recipients.filter(Boolean) : [recipients].filter(Boolean)
  if (!requestedIds.length) return res.status(400).json({ error: 'Нет получателей' })

  // Супер-админ (без company_id) не ограничен своей компанией — остальные
  // могут слать уведомления только сотрудникам своей компании.
  let ids = requestedIds
  if (!isSuperAdmin(ctx.profile)) {
    const { data: sameCompany } = await a.from('profiles')
      .select('user_id').in('user_id', requestedIds).eq('company_id', ctx.profile.company_id)
    ids = (sameCompany || []).map(p => p.user_id)
  }
  if (!ids.length) return res.status(400).json({ error: 'Ни один из получателей не найден в вашей компании' })

  const { error } = await a.from('notifications').insert(ids.map(id => ({ user_id: id, message, link: link || null, type: type || 'info' })))
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ success: true, sent_to: ids.length })
}
