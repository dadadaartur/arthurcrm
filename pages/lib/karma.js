// Единая точка начисления кармы — с учётом активных партнёрских бустов
// (п.11 ТЗ: «банк даёт +10% ко всем начислениям кармиков»).
//
// РАНЬШЕ прямое обновление karma_balance + запись в karma_transactions
// было продублировано в 8 разных файлах (tasks/submit.js, tasks/approve.js,
// cron/check-deadlines.js, kpi/test.js, kpi/tests.js,
// company-admin/kpi/{run-auto-source,entries-bulk,entries}.js) — у буста
// не было ни одной точки, куда его можно было бы подключить, не трогая
// все 8 файлов сразу с ощутимым риском что-то сломать при начислениях
// (это буквально денежная логика проекта).
//
// creditKarma() — безопасный дрок-ин: без активного буста результат
// побайтово идентичен старому инлайн-коду (тот же upsert +
// тот же insert). С активным бустом — сумма увеличивается на сумму
// процентов всех активных бустов пользователя, и в описании транзакции
// это явно видно.
//
// ВАЖНО: на сегодня переведены только tasks/approve.js (там начисляются
// и обычные, и партнёрские награды) и сама выдача партнёрского буста.
// Остальные 7 мест продолжают начислять напрямую, без буста — см.
// CHANGELOG.md, раздел про партнёрские задания, для точного списка и
// плана дальнейшего перевода.
export async function creditKarma(a, { userId, amount, type, description }) {
  const base = Number(amount) || 0
  if (base <= 0) return { credited: 0, boostPercent: 0 }

  const { data: boosts } = await a.from('karma_boosts')
    .select('percent')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
  const boostPercent = (boosts || []).reduce((s, b) => s + (Number(b.percent) || 0), 0)
  const credited = boostPercent > 0 ? Math.round(base * (1 + boostPercent / 100)) : base

  const { data: bal } = await a.from('karma_balance').select('balance').eq('user_id', userId).maybeSingle()
  await a.from('karma_balance').upsert({ user_id: userId, balance: (bal?.balance || 0) + credited }, { onConflict: 'user_id' })
  await a.from('karma_transactions').insert({
    user_id: userId, amount: credited, type,
    description: boostPercent > 0 ? `${description} (+${boostPercent}% партнёрский буст, база ${base})` : description
  })
  return { credited, boostPercent }
}

/** Выдать сотруднику партнёрский буст на N дней (задание с reward_type='karma_boost'). */
export async function grantKarmaBoost(a, { userId, companyId, percent, durationDays, source, sourceTaskId }) {
  const expires = new Date()
  expires.setDate(expires.getDate() + (Number(durationDays) || 30))
  await a.from('karma_boosts').insert({
    user_id: userId, company_id: companyId, percent: Number(percent) || 0,
    source: source || null, source_task_id: sourceTaskId || null, expires_at: expires.toISOString()
  })
}

/** Выдать сотруднику разблокировку категории/товара магазина (задание с reward_type='shop_unlock'). */
export async function grantUnlock(a, { userId, unlockKey, sourceTaskId }) {
  await a.from('employee_unlocks').upsert({
    user_id: userId, unlock_key: unlockKey, source_task_id: sourceTaskId || null, unlocked_at: new Date().toISOString()
  }, { onConflict: 'user_id,unlock_key' })
}
