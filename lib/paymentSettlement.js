// Общая логика «расчёта» успешного платежа ЮKassa.
// Вызывается из webhook (api/payments/callback) и из ручной проверки
// (api/payments/check-status), чтобы оба пути делали одно и то же:
// начислить компании, списать с Центробанка, записать в журнал,
// уведомить админов компании и основателя.
import { getFounderEmail } from './auth'

export async function settleSucceededPayment(sb, payment) {
  if (payment.payment_type === 'topup' && payment.karma_amount) {
    await applyTopup(sb, payment)
  }
  if (payment.payment_type === 'tariff_upgrade' && payment.tariff_code) {
    await applyTariffUpgrade(sb, payment)
  }
}

async function applyTopup(sb, payment) {
  const amount = Number(payment.karma_amount)

  // 1) Зачисляем кармики компании
  const { data: acc } = await sb
    .from('company_karma_accounts').select('*')
    .eq('company_id', payment.company_id).maybeSingle()
  if (acc) {
    await sb.from('company_karma_accounts').update({
      balance: Number(acc.balance) + amount,
      total_issued: Number(acc.total_issued || 0) + amount,
      updated_at: new Date().toISOString()
    }).eq('company_id', payment.company_id)
  }

  // 2) Списываем с Центробанка + запись в журнал
  await debitCentralBank(sb, amount, payment.company_id,
    `Пополнение через ЮKassa: ${payment.amount_rub} ₽ → ${amount} кармиков`)

  // 3) Уведомляем админов компании
  const { data: admins } = await sb.from('profiles')
    .select('user_id').eq('company_id', payment.company_id)
    .or('is_company_admin.eq.true,role_id.eq.1')
  if (admins?.length) {
    await sb.from('notifications').insert(admins.map(a => ({
      user_id: a.user_id,
      message: `Фонд компании пополнен: +${amount} кармиков (оплата ${payment.amount_rub} ₽)`,
      link: '/company-admin/resources'
    })))
  }

  // 4) Уведомляем основателя (суперадмина)
  await notifyFounder(sb,
    `Компания (ID ${payment.company_id}) купила ${amount} кармиков за ${payment.amount_rub} ₽. Списано с резерва Центробанка.`,
    '/central-bank')
}

async function applyTariffUpgrade(sb, payment) {
  const { data: tariff } = await sb.from('tariffs')
    .select('*').eq('code', payment.tariff_code).maybeSingle()
  if (!tariff) return

  await sb.from('company_karma_accounts').update({
    tariff_id: tariff.id,
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }).eq('company_id', payment.company_id)

  await sb.from('central_bank_ledger').insert({
    event_type: 'tariff_change',
    company_id: payment.company_id,
    amount: 0,
    description: `Смена тарифа на "${tariff.name}" (${payment.amount_rub} ₽)`
  })

  await notifyFounder(sb,
    `Компания (ID ${payment.company_id}) перешла на тариф "${tariff.name}" (${payment.amount_rub} ₽).`,
    '/central-bank')
}

// Списание с резерва Центробанка + запись в журнал
async function debitCentralBank(sb, amount, companyId, description) {
  const { data: bank } = await sb.from('central_bank').select('*').eq('id', 1).maybeSingle()
  if (bank) {
    await sb.from('central_bank').update({
      balance: Number(bank.balance) - amount,
      total_issued: Number(bank.total_issued || 0) + amount,
      updated_at: new Date().toISOString()
    }).eq('id', 1)
  }
  await sb.from('central_bank_ledger').insert({
    event_type: 'topup',
    company_id: companyId,
    amount,
    description
  })
}

async function notifyFounder(sb, message, link) {
  const { data: founder } = await sb.from('profiles')
    .select('user_id').eq('email', getFounderEmail()).maybeSingle()
  if (founder) {
    await sb.from('notifications').insert({ user_id: founder.user_id, message, link })
  }
}
