import { createClient } from '@supabase/supabase-js'
import { requireAuth, isFounder } from '../../../lib/auth'

// Эмиссия кармиков из Центробанка в казну конкретной компании.
// Только для основателя.
//
// РАНЬШЕ комментарий здесь утверждал "прямые атомарные обновления через
// service_role" — это было неточно: баланс central_bank читался, проверялся
// в JS и писался отдельным запросом (read-then-write), то есть при двух
// параллельных вызовах гонка была возможна точно так же, как раньше в
// pages/api/transfer.js. Теперь списание с central_bank идёт через условный
// UPDATE ... WHERE balance = <прочитанное значение> — если баланс успел
// измениться между чтением и записью, affected будет пустым, и мы вернём
// ошибку вместо того, чтобы молча затереть чужое изменение.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  if (!isFounder(ctx.user)) {
    return res.status(403).json({ error: 'Доступ только для основателя платформы' })
  }

  const { companyId } = req.body
  if (!companyId) return res.status(400).json({ error: 'companyId обязателен' })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Казна компании (создаём, если ещё нет)
  let { data: acc } = await sb.from('company_karma_accounts').select('*').eq('company_id', companyId).maybeSingle()
  if (!acc) {
    const { data: startTariff } = await sb.from('tariffs').select('id').eq('code', 'start').maybeSingle()
    const { data: newAcc, error: insErr } = await sb.from('company_karma_accounts').insert({
      company_id: companyId,
      tariff_id: startTariff?.id || null,
      balance: 0,
      valid_until: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
    }).select().single()
    if (insErr) return res.status(500).json({ error: 'Не удалось создать казну: ' + insErr.message })
    acc = newAcc
  }

  const { data: tariff } = acc.tariff_id
    ? await sb.from('tariffs').select('*').eq('id', acc.tariff_id).maybeSingle()
    : { data: null }
  if (!tariff || !tariff.karma_per_employee) {
    return res.status(400).json({ error: 'У компании нет тарифа с настроенной эмиссией' })
  }

  const { count } = await sb.from('profiles')
    .select('user_id', { count: 'exact', head: true })
    .eq('company_id', companyId).is('deleted_at', null).eq('is_company_admin', false)
  const employees = count || 0
  const emission = Number(tariff.karma_per_employee) * Math.max(employees, 1)

  const { data: bank } = await sb.from('central_bank').select('*').eq('id', 1).maybeSingle()
  if (!bank) return res.status(500).json({ error: 'Центробанк не найден — прогони SQL-скрипт' })
  if (Number(bank.balance) < emission) {
    return res.status(400).json({ error: 'Недостаточно капитала в Центробанке' })
  }

  // Условное списание: сработает, только если баланс central_bank не
  // изменился с момента чтения выше (см. комментарий в начале файла).
  const { data: bankUpdated, error: bankUpdErr } = await sb.from('central_bank')
    .update({
      balance: Number(bank.balance) - emission,
      total_issued: Number(bank.total_issued || 0) + emission,
      updated_at: new Date().toISOString()
    })
    .eq('id', 1)
    .eq('balance', bank.balance)
    .select('id')
  if (bankUpdErr) return res.status(500).json({ error: bankUpdErr.message })
  if (!bankUpdated || bankUpdated.length === 0) {
    return res.status(409).json({ error: 'Баланс Центробанка изменился параллельно — повторите операцию' })
  }

  const { error: updErr } = await sb.from('company_karma_accounts').update({
    balance: Number(acc.balance || 0) + emission,
    total_issued: Number(acc.total_issued || 0) + emission,
    last_emission_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('company_id', companyId)
  if (updErr) return res.status(500).json({ error: updErr.message })

  await sb.from('central_bank_ledger').insert({
    event_type: 'emission',
    company_id: companyId,
    amount: emission,
    description: `Эмиссия по тарифу "${tariff.name}": ${tariff.karma_per_employee} карм./сотр. × ${Math.max(employees, 1)}`
  })

  res.status(200).json({
    success: true,
    emitted: emission,
    new_company_balance: Number(acc.balance || 0) + emission,
    new_bank_balance: Number(bank.balance) - emission
  })
}
