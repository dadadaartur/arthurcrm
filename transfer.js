import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

// Раньше этот файл не использовал requireAuth и дублировал логику
// извлечения токена — теперь приведён к единому стандарту.
//
// История правок баланса:
// 1) Изначально вызывался RPC transfer_karma() — падал с "Could not find
//    function in schema cache" (PostgREST не видел функцию после её
//    создания — нужен reload schema cache, см. transfer_karma.sql).
// 2) Временный фикс заменил RPC на ручной read-then-write через
//    service-role (update balance = balance - amount, посчитанное в JS).
//    Это завело гонку: при двух параллельных переводах от одного юзера
//    оба запроса читают один и тот же баланс до того, как кто-либо из них
//    его запишет — итог: списание срабатывает дважды, баланс уходит в
//    минус, хотя проверка "баланс >= сумма" вроде бы проходила. Плюс
//    полностью пропускалась проверка активности компании (RLS-политика
//    my_company_is_active не действует — service-role обходит RLS целиком).
// 3) Возвращаемся к RPC, но с function-level блокировкой строк
//    (SELECT ... FOR UPDATE внутри transfer_karma, см. миграцию) — это
//    и решает гонку, и восстанавливает проверку активности компании.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  const { recipientEmail, amount, comment } = req.body
  const transferAmount = Number.isInteger(amount) ? amount : parseInt(amount, 10)

  if (!recipientEmail || !Number.isInteger(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({ error: 'Неверные параметры' })
  }
  if (!ctx.profile.company_id) {
    return res.status(400).json({ error: 'У вас нет компании' })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const normalEmail = recipientEmail.trim().toLowerCase()

  // Поиск получателя — не критичен к гонкам, читается один раз, id уходит
  // в атомарную функцию ниже, которая сама перепроверит компанию и статус.
  const { data: recipient, error: recipError } = await supabaseAdmin
    .from('profiles')
    .select('user_id, email, company_id')
    .eq('email', normalEmail)
    .is('deleted_at', null)
    .maybeSingle()

  if (recipError) {
    console.error('[transfer] ошибка поиска получателя', recipError)
    return res.status(500).json({ error: 'Ошибка поиска получателя: ' + recipError.message })
  }
  if (!recipient) return res.status(404).json({ error: 'Получатель не найден' })
  if (recipient.user_id === ctx.user.id) {
    return res.status(400).json({ error: 'Нельзя перевести самому себе' })
  }

  // Сам перевод — атомарно, одной SQL-функцией с блокировкой строк.
  // p_from_user_id берём из проверенного requireAuth токена, а не из
  // тела запроса — клиент не может подставить чужой id отправителя.
  const { data: result, error: transferError } = await supabaseAdmin
    .rpc('transfer_karma', {
      p_from_user_id: ctx.user.id,
      p_to_user_id: recipient.user_id,
      p_amount: transferAmount,
      p_comment: comment || null
    })
    .single()

  if (transferError) {
    console.error('[transfer] ошибка перевода', transferError)
    // Сообщения из RAISE EXCEPTION (недостаточно кармиков, другая компания,
    // компания неактивна и т.д.) долетают в transferError.message как есть —
    // их можно показать пользователю напрямую.
    const status = /не найден|недоступн|неактивна|другой компании|самому себе|Недостаточно/.test(transferError.message)
      ? 400
      : 500
    return res.status(status).json({ error: transferError.message })
  }

  // Уведомления — best-effort, не должны рушить успешно завершённый перевод.
  const { error: notifyError } = await supabaseAdmin.from('notifications').insert([
    {
      user_id: ctx.user.id,
      message: `Вы перевели ${transferAmount} кармиков → ${normalEmail}${comment ? '. ' + comment : ''}`,
      link: '/history'
    },
    {
      user_id: recipient.user_id,
      message: `Вам перевели ${transferAmount} кармиков от ${ctx.profile.email || ctx.user.email}${comment ? '. Комментарий: ' + comment : ''}`,
      link: '/history'
    }
  ])
  if (notifyError) {
    console.error('[transfer] перевод прошёл, но уведомления не создались', notifyError)
  }

  res.status(200).json({ newBalance: result.new_sender_balance })
}
