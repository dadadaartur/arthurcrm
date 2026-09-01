// Единый источник истины по ценам платформы.
//
// ПОЧЕМУ ЭТОТ ФАЙЛ ПОЯВИЛСЯ: раньше amountRub и karmaAmount приходили из
// req.body от клиента НЕЗАВИСИМО друг от друга — pages/api/payments/create.js
// просто доверял обоим числам и использовал karmaAmount при зачислении,
// а amountRub при списании реальных денег через ЮKassa. Это позволяло
// заказать оплату в 1 ₽ и указать любое karmaAmount — сервер их никак не
// связывал. Теперь karmaAmount (или tariffCode) считается «что купить»,
// а сколько это стоит в рублях — ВСЕГДА считает сервер по значениям ниже,
// клиентский amountRub полностью игнорируется.
//
// TOPUP_RATE должен совпадать с константой на фронтенде
// (pages/company-admin/resources.js, TOPUP_RATE) — в идеале фронтенд стоит
// перевести на чтение этого же значения через отдельный GET-эндпоинт, чтобы
// курс жил в одном месте, а не дублировался. Пока не сделано — не забудьте
// поменять оба места разом, если решите изменить курс.
export const TOPUP_RATE = { rub: 1000, karma: 100 } // 10 ₽ = 1 кармик

export function rubForKarma(karmaAmount) {
  return Math.round((Number(karmaAmount) / TOPUP_RATE.karma) * TOPUP_RATE.rub)
}

// Тариф "ultra" — фиксированная цена вне зависимости от числа сотрудников
// (см. pages/company-admin/resources.js, handleChangeTariff). Остальные
// тарифы считаются как price_per_employee_rub * employeesCount.
// TODO(product): перенести это правило в саму таблицу tariffs (например,
// колонку flat_price_rub), чтобы не хардкодить код тарифа в двух местах.
const FLAT_PRICE_TARIFFS = { ultra: 10000 }

/**
 * Считает реальную цену апгрейда тарифа СЕРВЕРОМ — на основе tariff-записи
 * из БД (а не значений, присланных клиентом) и реального числа активных
 * сотрудников компании (тоже посчитанного сервером).
 */
export function priceForTariffUpgrade(tariff, employeesCount) {
  const n = Math.max(1, Number(employeesCount) || 1)
  const amountRub = FLAT_PRICE_TARIFFS[tariff.code] ?? Number(tariff.price_per_employee_rub) * n
  const karmaAmount = Number(tariff.karma_per_employee) * n
  return { amountRub, karmaAmount }
}
