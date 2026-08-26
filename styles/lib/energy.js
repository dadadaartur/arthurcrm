// Единая точка начисления энергии — с дневным потолком (п.8 обратной
// связи от 26 августа 2026: «энергия набралась за пару дней вместо
// месяцев»). Реальные пороги уровней на момент расчёта: Специалист 600,
// Старший специалист 1800, Эксперт 4200, Мастер 9000, Легенда 18000.
//
// MAX_DAILY_ENERGY = 100 подобран так, чтобы верхний уровень (Легенда,
// 18000) требовал около 180 дней (полгода) стабильной работы на
// максимуме — Специалист (600) при этом всё ещё достижим за первую
// неделю-две, чтобы не разочаровывать новых сотрудников слишком долгим
// стартом. Это одно число — не стесняйтесь попросить поменять, если темп
// покажется не тем.
//
// Потолок общий на ВСЕ источники сразу (пороги показателей, автозадания,
// тестирование) — раньше у каждого источника не было понятия о других,
// поэтому пороги показателя + автозадание + пара тестов в один день
// суммарно могли перекрыть месячный план.
export const MAX_DAILY_ENERGY = 100

export async function creditEnergy(a, userId, amount) {
  const requested = Math.max(0, Math.round(Number(amount) || 0))
  if (requested <= 0) return 0

  const today = new Date().toISOString().slice(0, 10)
  const { data: row } = await a.from('kpi_energy').select('energy, today_granted, today_date').eq('user_id', userId).maybeSingle()
  const isNewDay = row?.today_date !== today
  const grantedToday = isNewDay ? 0 : (row?.today_granted || 0)
  const allowed = Math.max(0, Math.min(requested, MAX_DAILY_ENERGY - grantedToday))
  if (allowed <= 0) return 0

  await a.from('kpi_energy').upsert({
    user_id: userId,
    energy: (row?.energy || 0) + allowed,
    today_granted: grantedToday + allowed,
    today_date: today,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  return allowed
}
