// Общая обвязка над API ЮKassa.
//
// РАНЬШЕ: pages/api/payments/callback.js (webhook) верил телу входящего
// запроса без проверки — event/object брались из req.body и сразу считались
// правдой. У ЮKassa нет подписи запроса «из коробки» в базовой схеме
// уведомлений, поэтому единственный надёжный способ убедиться, что платёж
// правда прошёл, — переспросить это напрямую у ЮKassa по payment_id
// (именно так уже было сделано в check-status.js, но НЕ в webhook).
// Теперь оба места используют одну и ту же проверку ниже.
export async function fetchYooKassaPayment(yookassaPaymentId) {
  const shopId = process.env.YOOKASSA_SHOP_ID
  const secret = process.env.YOOKASSA_SECRET
  if (!shopId || !secret) {
    throw new Error('YOOKASSA_SHOP_ID / YOOKASSA_SECRET не заданы на сервере')
  }
  const resp = await fetch(`https://api.yookassa.ru/v3/payments/${yookassaPaymentId}`, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${shopId}:${secret}`).toString('base64') }
  })
  if (!resp.ok) {
    throw new Error(`ЮKassa вернула ${resp.status} при опросе платежа ${yookassaPaymentId}`)
  }
  return resp.json()
}
