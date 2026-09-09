// Простой rate limiter без внешних зависимостей (Redis/Upstash в проекте
// нет, а serverless-функции Vercel не хранят состояние между вызовами, так
// что in-memory счётчик работать бы не стал). Хранит хиты в Postgres —
// таблица rate_limit_hits, см. migrations/002_rate_limiting.sql.
//
// Fail-open: если сама проверка лимита падает (таблицы ещё нет, сеть,
// что угодно), запрос ПРОПУСКАЕТСЯ, а не блокируется — лимитер не должен
// становиться новой причиной недоступности сервиса.
//
// sb должен быть клиентом с service-role ключом (пишет в rate_limit_hits
// в обход RLS).
export async function checkRateLimit(sb, bucketKey, { max, windowSeconds }) {
  try {
    const since = new Date(Date.now() - windowSeconds * 1000).toISOString()
    const { count, error } = await sb
      .from('rate_limit_hits')
      .select('id', { count: 'exact', head: true })
      .eq('bucket_key', bucketKey)
      .gte('created_at', since)
    if (error) throw error
    if ((count || 0) >= max) {
      return { allowed: false }
    }
    await sb.from('rate_limit_hits').insert({ bucket_key: bucketKey })
    return { allowed: true }
  } catch (e) {
    console.error('[rateLimit] ошибка проверки лимита — пропускаем запрос (fail open):', bucketKey, e?.message || e)
    return { allowed: true }
  }
}
