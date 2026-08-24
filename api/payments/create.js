import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'
import { rubForKarma, priceForTariffUpgrade } from '../../../lib/pricing'
import { checkRateLimit } from '../../../lib/rateLimit'

// РАНЬШЕ amountRub и karmaAmount/tariffCode приходили из req.body как готовая
// пара «сумма + сколько кармиков», НЕЗАВИСИМО друг от друга — можно было
// прислать amountRub: 1 и karmaAmount: 999999999 и сервер бы их доверчиво
// связал (см. лог аудита, находка №1). Теперь клиент говорит только ЧТО он
// покупает (paymentType + karmaAmount для topup, или tariffCode для апгрейда),
// а сколько это стоит в рублях и сколько кармиков придёт — ВСЕГДА считает
// сервер по lib/pricing.js и актуальным данным из БД. Также убран
// захардкоженный тестовый fallback для ключей ЮKassa (находка №11).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const companyId = ctx.profile?.company_id
  const isAdmin = ctx.profile?.is_company_admin || ctx.profile?.role_id === 1
  if (!companyId || !isAdmin) return res.status(403).json({ error: 'Недостаточно прав' })

  const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID
  const YOOKASSA_SECRET = process.env.YOOKASSA_SECRET
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET) {
    console.error('[payments/create] не заданы YOOKASSA_SHOP_ID / YOOKASSA_SECRET')
    return res.status(500).json({ error: 'Платёжный шлюз не настроен на сервере' })
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { allowed } = await checkRateLimit(sb, `payments-create:${companyId}`, { max: 10, windowSeconds: 600 })
  if (!allowed) return res.status(429).json({ error: 'Слишком много попыток создать платёж — попробуйте позже' })

  const { paymentType, karmaAmount, tariffCode } = req.body

  let amountRub, finalKarmaAmount, description

  if (paymentType === 'topup') {
    finalKarmaAmount = Number(karmaAmount)
    if (!Number.isFinite(finalKarmaAmount) || finalKarmaAmount <= 0) {
      return res.status(400).json({ error: 'Некорректное количество кармиков' })
    }
    amountRub = rubForKarma(finalKarmaAmount)
    description = `Пополнение фонда: ${finalKarmaAmount} кармиков`
  } else if (paymentType === 'tariff_upgrade') {
    if (!tariffCode) return res.status(400).json({ error: 'Не указан тариф' })
    const { data: tariff, error: tariffError } = await sb
      .from('tariffs').select('*').eq('code', tariffCode).eq('is_active', true).maybeSingle()
    if (tariffError || !tariff) return res.status(400).json({ error: 'Тариф не найден' })

    const { count } = await sb.from('profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('company_id', companyId).is('deleted_at', null)
    const priced = priceForTariffUpgrade(tariff, count || 1)
    amountRub = priced.amountRub
    finalKarmaAmount = priced.karmaAmount
    description = `Переход на тариф: ${tariff.name}`
  } else {
    return res.status(400).json({ error: 'Неизвестный тип платежа' })
  }

  if (!amountRub || amountRub <= 0) {
    return res.status(400).json({ error: 'Не удалось рассчитать сумму платежа' })
  }

  const returnBase = process.env.NEXT_PUBLIC_APP_URL || 'https://arthurcrm.vercel.app'
  const idempotenceKey = `karma-${companyId}-${Date.now()}-${Math.random().toString(36).substring(7)}`

  const yookassaResponse = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotence-Key': idempotenceKey,
      'Authorization': `Basic ${Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET}`).toString('base64')}`
    },
    body: JSON.stringify({
      amount: { value: amountRub.toFixed(2), currency: 'RUB' },
      confirmation: { type: 'redirect', return_url: `${returnBase}/company-admin/resources?payment=success` },
      capture: true,
      description,
      metadata: { company_id: companyId, karma_amount: finalKarmaAmount, payment_type: paymentType, tariff_code: tariffCode || '' }
    })
  })
  if (!yookassaResponse.ok) {
    const err = await yookassaResponse.json().catch(() => ({}))
    return res.status(400).json({ error: 'Ошибка ЮKassa: ' + (err.description || JSON.stringify(err)) })
  }
  const paymentData = await yookassaResponse.json()

  // amount_rub и karma_amount, записанные в БД, — это значения, СЧИТАННЫЕ
  // СЕРВЕРОМ выше, а не то, что прислал клиент.
  const { data: payment, error: dbError } = await sb.from('payments').insert({
    company_id: companyId,
    amount_rub: amountRub,
    karma_amount: finalKarmaAmount,
    payment_type: paymentType,
    tariff_code: tariffCode || null,
    yookassa_payment_id: paymentData.id,
    status: 'pending',
    metadata: { tariff_code: tariffCode || null }
  }).select().single()
  if (dbError) return res.status(500).json({ error: 'Ошибка БД: ' + dbError.message })

  res.status(200).json({ payment_id: payment.id, confirmation_url: paymentData.confirmation?.confirmation_url })
}
