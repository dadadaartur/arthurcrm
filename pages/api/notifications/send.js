import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

// Универсальная серверная точка отправки уведомлений внутри компании.
// RLS запрещает вставку notifications с клиента (только service_role),
// поэтому страницы, которым нужно уведомить сотрудников (новое задание,
// новый товар в магазине), вызывают этот роут.
//
// Защита: вызывающий должен иметь право can_create_tasks (есть у админа
// компании и супер-админа автоматически), а получатели проверяются как
// активные сотрудники ЕГО компании — уведомить чужую компанию нельзя.
const ALLOWED_TYPES = ['task_new', 'task_done', 'purchase', 'purchase_review', 'shop', 'transfer', 'system']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res, { permission: 'can_create_tasks' })
  if (!ctx) return

  const { recipients, type, message, link } = req.body
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'Нет получателей' })
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Неизвестный тип события' })
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Нет текста уведомления' })
  }
  if (!ctx.profile.company_id) {
    return res.status(400).json({ error: 'У вас нет компании' })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Получатели должны быть активными сотрудниками компании вызывающего
  const { data: validProfiles, error: checkError } = await supabaseAdmin
    .from('profiles')
    .select('user_id')
    .eq('company_id', ctx.profile.company_id)
    .is('deleted_at', null)
    .in('user_id', recipients.slice(0, 200))

  if (checkError) {
    console.error('[notifications/send] ошибка проверки получателей', checkError)
    return res.status(500).json({ error: 'Ошибка проверки получателей' })
  }

  const validIds = (validProfiles || []).map(p => p.user_id)
  if (validIds.length === 0) {
    return res.status(400).json({ error: 'Получатели не найдены в вашей компании' })
  }

  const { error: insertError } = await supabaseAdmin.from('notifications').insert(
    validIds.map(uid => ({
      user_id: uid,
      type,
      message: message.trim().slice(0, 300),
      link: link || '/'
    }))
  )

  if (insertError) {
    console.error('[notifications/send] ошибка вставки', insertError)
    return res.status(500).json({ error: 'Не удалось отправить уведомления' })
  }

  res.status(200).json({ success: true, sent: validIds.length })
}
