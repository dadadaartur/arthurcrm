import { createClient } from '@supabase/supabase-js'
import { requirePlatformStaff } from '../../../lib/auth'

// Живая проверка ключа разблокировки (пункт 3 фидбека от 1 сентября
// 2026) — ключ остаётся произвольной строкой намеренно: партнёрские
// задания суперадмина работают сразу по всем компаниям платформы, а
// товары в магазине привязаны к одной конкретной компании, поэтому
// выпадающий список «выберите товар» технически не подходит — нет
// единого списка, из которого выбирать. Вместо этого — честная
// обратная связь: сколько товаров сейчас в принципе используют такой
// ключ, чтобы поймать опечатку до того, как задание уйдёт сотрудникам,
// а не после.
export default async function handler(req, res) {
  const ctx = await requirePlatformStaff(req, res, { permission: 'manage_partner_tasks' })
  if (!ctx) return
  const key = (req.query.key || '').trim()
  if (!key) return res.status(200).json({ count: 0, items: [] })
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: rewards } = await a.from('rewards').select('id, name, company_id, companies(name)').eq('requires_unlock', key)
  res.status(200).json({
    count: (rewards || []).length,
    items: (rewards || []).map(r => ({ name: r.name, company: r.companies?.name || '—' })),
  })
}
