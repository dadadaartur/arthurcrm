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

  const oldEnergy = row?.energy || 0
  const newEnergy = oldEnergy + allowed

  await a.from('kpi_energy').upsert({
    user_id: userId,
    energy: newEnergy,
    today_granted: grantedToday + allowed,
    today_date: today,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  // Лента подарков (бывшее «колесо фортуны», переименовано и переделано 31 августа 2026) — попытка
  // выдаётся за переход на новый уровень мастерства. Единая точка
  // начисления энергии — единственное место, где корректно видно и
  // старое, и новое значение сразу, поэтому выдача попытки живёт здесь,
  // а не размазана по всем 7 местам, что раньше писали в kpi_energy
  // напрямую.
  try {
    const { data: profile } = await a.from('profiles').select('company_id').eq('user_id', userId).maybeSingle()
    if (profile?.company_id) {
      const { data: config } = await a.from('wheel_configs').select('enabled, levels_per_spin').eq('company_id', profile.company_id).maybeSingle()
      if (config?.enabled) {
        const { data: levels } = await a.from('progress_levels').select('energy_threshold').order('energy_threshold')
        const crossed = (levels || []).filter(l => oldEnergy < l.energy_threshold && newEnergy >= l.energy_threshold).length
        const spinsToGrant = Math.floor(crossed / Math.max(1, config.levels_per_spin || 1))
        if (spinsToGrant > 0) {
          const { data: prof2 } = await a.from('profiles').select('wheel_spins_available').eq('user_id', userId).maybeSingle()
          await a.from('profiles').update({ wheel_spins_available: (prof2?.wheel_spins_available || 0) + spinsToGrant }).eq('user_id', userId)
          await a.from('notifications').insert({ user_id: userId, message: `Новый уровень мастерства! Доступна попытка в колесе фортуны (${spinsToGrant}).`, link: '/goals' })
        }
      }
    }
  } catch (e) {
    // Лента подарков — бонусная механика поверх энергии, не должна ломать сам
    // факт начисления энергии, если что-то пошло не так (например,
    // миграция 014 ещё не применена).
  }

  return allowed
}
