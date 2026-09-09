// Универсальный коннектор внешних источников KPI.
// source_config: { url, emailField, valueField } — ожидается JSON-массив
// объектов вида [{ email, value }]. Пока источник не настроен — возвращает [].
export async function pullAutoValues(metric) {
  try {
    if (metric.source !== 'auto' || !metric.source_config?.url) return []
    const res = await fetch(metric.source_config.url)
    if (!res.ok) return []
    const data = await res.json()
    const ef = metric.source_config.emailField || 'email'
    const vf = metric.source_config.valueField || 'value'
    return (Array.isArray(data) ? data : []).map(r => ({ email: r[ef], value: Number(r[vf]) }))
  } catch (e) { return [] }
}
