import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res)
  if (!ctx) return

  const { rewardId, activateLater, date, comment } = req.body
  if (!rewardId) return res.status(400).json({ error: 'Нет rewardId' })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  const userId = ctx.user.id

  // Партнёрские товары (п.11 ТЗ) — требуют разблокировки через выполнение
  // соответствующего задания от партнёра. Проверяем ДО вызова RPC
  // purchase_reward, а не внутри неё — исходник этой функции создан
  // напрямую в Supabase (её нет ни в одном файле миграций этого репозитория),
  // поэтому переписывать её саму рискованнее, чем остановить покупку раньше.
  const { data: reward } = await supabaseAdmin.from('rewards').select('requires_unlock').eq('id', rewardId).maybeSingle()
  if (reward?.requires_unlock) {
    const { data: unlock } = await supabaseAdmin.from('employee_unlocks').select('id').eq('user_id', userId).eq('unlock_key', reward.requires_unlock).maybeSingle()
    if (!unlock) return res.status(403).json({ error: 'Этот товар доступен только после выполнения соответствующего партнёрского задания' })
  }

  const { data, error: purchaseError } = await supabaseAdmin.rpc('purchase_reward', {
    p_user_id: userId,
    p_reward_id: rewardId,
    p_activate_later: !!activateLater,
    p_date: date || null,
    p_comment: comment || null
  })

  if (purchaseError) {
    const msg = purchaseError.message || 'Ошибка покупки'
    if (msg.includes('Недостаточно')) return res.status(400).json({ error: 'Недостаточно кармиков' })
    if (msg.includes('Лимит')) return res.status(400).json({ error: msg })
    if (msg.includes('Награда не найдена')) return res.status(404).json({ error: 'Награда не найдена' })
    return res.status(500).json({ error: msg })
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result) return res.status(500).json({ error: 'Пустой ответ от сервера' })

  const { new_balance: newBalance, new_status: newStatus, reward_name: rewardName } = result

  let message = `Вы приобрели "${rewardName}" за ${result.reward_cost} кармиков.`
  if (newStatus === 'new') {
    message += ' Сертификат можно активировать позже в разделе «Мои покупки».'
  } else if (newStatus === 'pending') {
    message += ' Заявка отправлена на согласование руководителю.'
  } else if (newStatus === 'approved') {
    message += ' Товар будет доставлен — ожидайте!'
  }

  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    message,
    link: '/my-purchases'
  })

  // Уведомляем всех ревьюеров компании о ЛЮБОЙ покупке (pending + approved).
  // Раньше уведомление уходило только при pending — физические товары без
  // подтверждения (approved) оседали незамеченными, руководитель не знал,
  // что нужно что-то доставить сотруднику.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('company_id, display_name, email')
    .eq('user_id', userId)
    .single()

  if (profile?.company_id) {
    const { data: reviewers } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('company_id', profile.company_id)
      .neq('user_id', userId)
      .or('is_company_admin.eq.true,can_review_tasks.eq.true')

    if (reviewers?.length) {
      const employeeName = profile.display_name || profile.email || 'Сотрудник'
      const actionText = newStatus === 'pending'
        ? 'требует подтверждения'
        : 'оплачен и ожидает доставки'
      const notifs = reviewers.map(r => ({
        user_id: r.user_id,
        message: `${employeeName} купил «${rewardName}» — ${actionText}.`,
        link: '/company-admin/purchases'
      }))
      await supabaseAdmin.from('notifications').insert(notifs)
    }
  }
  res.status(200).json({ newBalance, message })
}
