import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'
import { checkRateLimit } from '../../lib/rateLimit'

// РАНЬШЕ баланс читался, проверялся в JS и писался отдельным запросом
// (read-then-write) — при двух параллельных переводах от одного юзера оба
// запроса читали один и тот же баланс до того, как любой из них его
// запишет, и списание срабатывало дважды. Теперь сам перевод — один
// атомарный вызов SQL-функции transfer_karma с блокировкой строк, см.
// migrations/001_transfer_karma.sql (миграцию нужно применить ДО деплоя
// этого файла, иначе rpc() будет падать).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const { recipientId, recipientEmail, amount, comment } = req.body
  const transferAmount = Number.isInteger(amount) ? amount : parseInt(amount, 10)
  if ((!recipientId && !recipientEmail) || !Number.isInteger(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({ error: 'Неверные параметры' })
  }
  if (!ctx.profile.company_id) return res.status(400).json({ error: 'У вас нет компании' })

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { allowed } = await checkRateLimit(supabaseAdmin, `transfer:${ctx.user.id}`, { max: 30, windowSeconds: 300 })
  if (!allowed) return res.status(429).json({ error: 'Слишком много переводов подряд — попробуйте через несколько минут' })

  let recipient = null
  if (recipientId) {
    const { data } = await supabaseAdmin.from('profiles').select('user_id, email, company_id').eq('user_id', recipientId).is('deleted_at', null).maybeSingle()
    recipient = data
  } else {
    const normalEmail = recipientEmail.trim().toLowerCase()
    const { data } = await supabaseAdmin.from('profiles').select('user_id, email, company_id').eq('email', normalEmail).is('deleted_at', null).maybeSingle()
    recipient = data
  }
  if (!recipient) return res.status(404).json({ error: 'Получатель не найден' })
  if (recipient.user_id === ctx.user.id) return res.status(400).json({ error: 'Нельзя перевести самому себе' })
  if (recipient.company_id !== ctx.profile.company_id) return res.status(403).json({ error: 'Получатель из другой компании' })

  // Сам перевод — атомарно, одной SQL-функцией с блокировкой строк.
  // p_from_user_id берём из проверенного requireAuth-токена, а не из тела
  // запроса — клиент не может подставить чужого отправителя.
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
    const status = /не найден|недоступн|неактивна|другой компании|самому себе|Недостаточно|Некорректн/i.test(transferError.message)
      ? 400
      : 500
    return res.status(status).json({ error: transferError.message })
  }

  // Уведомления — best-effort, не должны рушить успешно завершённый перевод.
  const { error: notifyError } = await supabaseAdmin.from('notifications').insert([
    { user_id: ctx.user.id, message: `Вы перевели ${transferAmount} кармиков → ${recipient.email}${comment ? '. ' + comment : ''}`, link: '/history' },
    { user_id: recipient.user_id, message: `Вам перевели ${transferAmount} кармиков от ${ctx.profile.email || ctx.user.email}${comment ? '. Комментарий: ' + comment : ''}`, link: '/history' }
  ])
  if (notifyError) console.error('[transfer] перевод прошёл, но уведомления не создались', notifyError)

  res.status(200).json({ newBalance: result.new_sender_balance })
}
