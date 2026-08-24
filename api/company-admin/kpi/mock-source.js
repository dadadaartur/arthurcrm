import { createClient } from '@supabase/supabase-js'

// Имитатор внешнего источника KPI для тест-стенда (п.7 ТЗ).
// Реальная интеграция с внешней CRM подключается так же — через
// kpi_metrics.source_config.url (см. lib/kpiSource.js::pullAutoValues) —
// этот эндпоинт просто играет роль «внешней системы» для проверки всей
// цепочки без реального стороннего сервиса. Отдаёт то, что админ ввёл на
// странице /company-admin/crm-sandbox (хранится в самом же
// source_config.mock_data — отдельной таблицы под тестовые данные нет
// специально, чтобы не плодить лишнюю схему под то, что по сути является
// песочницей).
//
// Без авторизации — так же, как и настоящий внешний источник, который
// pullAutoValues() дёргает обычным fetch() без заголовков. ID показателя —
// UUID, угадать нельзя, а сами данные — тестовые, не боевые.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { metricId } = req.query
  if (!metricId) return res.status(400).json({ error: 'metricId обязателен' })

  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: metric } = await a.from('kpi_metrics').select('source_config').eq('id', metricId).maybeSingle()
  const mock = metric?.source_config?.mock_data
  res.status(200).json(Array.isArray(mock) ? mock : [])
}
