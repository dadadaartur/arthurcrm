import { createClient } from '@supabase/supabase-js'
import { bandFor, bandRankOf, energyFor, karmaFor } from '../../../lib/kpi'
import { pullAutoValues } from '../../../lib/kpiSource'
import { creditEnergy } from '../../../lib/energy'
import { currentPeriodKey, isWithinRecurrenceWindow } from '../../../lib/recurrence'
import { resolveTaskAudience } from '../../../lib/taskAudience'

// РАНЬШЕ: этот хендлер не проверял вообще ничего — vercel.json настраивает
// только РАСПИСАНИЕ вызова, а сам URL /api/cron/check-deadlines оставался
// публичным HTTP-эндпоинтом, который мог дёрнуть кто угодно, сколько
// угодно раз. Теперь требуется секрет в заголовке Authorization — его
// нужно задать в CRON_SECRET (.env) и в конфигурации Vercel Cron
// (Vercel сам добавляет этот заголовок к своим вызовам по расписанию,
// если он указан в vercel.json/настройках проекта).
export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/check-deadlines] CRON_SECRET не задан на сервере')
    return res.status(500).json({ error: 'Cron secret не настроен' })
  }
  if (req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const now = new Date()
  const soon = new Date(now.getTime() + 24 * 3600 * 1000)
  const today = now.toISOString().slice(0, 10)

  // 0) Генерация периодов регулярных заданий (движок регулярности,
  // 1 сентября 2026). РАНЬШЕ recurrence_type/frequency нигде не
  // обрабатывался — «ежедневное» задание работало как разовое. Теперь на
  // каждый период (час/день/неделя) создаётся отдельная строка
  // назначения — не переиспользуем одну и ту же, чтобы была честная
  // история по периодам для будущей аналитики.
  // 0б) Итоги месячной гонки — 1 числа определяем топ-3 ПРОШЕДШЕГО
  // месяца по кармикам, заработанным за него (марафон ИИ-аналитика,
  // часть 2, 6 сентября 2026). Идемпотентно — если победители за этот
  // цикл уже записаны (cron мог сработать несколько раз 1 числа при
  // часовом расписании), повторно не считаем и не уведомляем заново.
  if (now.getDate() === 1) {
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)
    const cycleMonth = prevMonthStart.toISOString().slice(0, 10)
    const { data: companies } = await a.from('companies').select('id').eq('status', 'active')
    for (const company of companies || []) {
      const { data: already } = await a.from('race_winners').select('id').eq('company_id', company.id).eq('cycle_month', cycleMonth).limit(1)
      if (already?.length) continue
      const { data: emps } = await a.from('profiles').select('user_id').eq('company_id', company.id).eq('is_company_admin', false).is('deleted_at', null)
      const empIds = (emps || []).map(e => e.user_id)
      if (!empIds.length) continue
      const { data: txns } = await a.from('karma_transactions').select('user_id, amount')
        .in('user_id', empIds).gte('created_at', prevMonthStart.toISOString()).lt('created_at', prevMonthEnd.toISOString()).gt('amount', 0)
      const earned = {}
      ;(txns || []).forEach(t => { earned[t.user_id] = (earned[t.user_id] || 0) + Number(t.amount) })
      const top3 = Object.entries(earned).sort((x, y) => y[1] - x[1]).slice(0, 3).filter(([, v]) => v > 0)
      if (!top3.length) continue
      await a.from('race_winners').insert(top3.map(([userId, karma], i) => ({ company_id: company.id, cycle_month: cycleMonth, rank: i + 1, user_id: userId, karma_earned: karma })))
      await a.from('notifications').insert(top3.map(([userId], i) => ({
        user_id: userId, link: '/race',
        message: i === 0 ? `Вы — победитель месячной гонки! 1 место, заработано ${earned[userId]} кармиков. Доступна привилегия — создать до 2 шуточных заданий коллегам.`
          : `Вы в топ-3 месячной гонки — ${i + 1} место! Доступна привилегия — создать до 2 шуточных заданий коллегам.`,
      })))
    }
  }

  const { data: recurringTasks } = await a.from('tasks')
    .select('*')
    .eq('is_active', true).eq('is_archived', false)
    .neq('recurrence_type', 'once')

  let periodsGenerated = 0
  for (const task of recurringTasks || []) {
    if (!isWithinRecurrenceWindow(task, now)) {
      // Окно действия завершилось (recurrence_end_date в прошлом) —
      // регулярность закончилась, дальше не генерируем и архивируем,
      // чтобы задание не висело вечно активным без смысла.
      if (task.recurrence_end_date && today > task.recurrence_end_date) {
        await a.from('tasks').update({ is_archived: true, archived_at: now.toISOString() }).eq('id', task.id)
      }
      continue
    }
    const periodKey = currentPeriodKey(task, now)
    if (!periodKey) continue

    // Аудитория — единый резолвер lib/taskAudience.js (та же логика,
    // что при создании задания в tasks/create.js). Для specific — из
    // сохранённого на задаче target_user_ids; для остальных режимов
    // (включая новые level/metric_below/energy_bottom) пересчитывается
    // заново на каждый период — это даёт корректный список даже если
    // состав команды или показатели с тех пор изменились.
    const targetUserIds = await resolveTaskAudience(a, task, {})
    if (!targetUserIds.length) continue

    // Дедлайн этого конкретного периода — до следующего сброса, а не
    // произвольная дата задания (у регулярного задания смысл именно в
    // «успеть до следующего часа/дня/недели», не в конце календарного
    // месяца).
    let periodDeadline = null
    if (task.recurrence_type === 'hourly') { const d = new Date(now); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); periodDeadline = d.toISOString() }
    if (task.recurrence_type === 'daily') { const d = new Date(now); d.setHours(task.reset_hour ?? 8, 0, 0, 0); if (d <= now) d.setDate(d.getDate() + 1); periodDeadline = d.toISOString() }
    if (task.recurrence_type === 'weekly') { const d = new Date(now); d.setHours(task.reset_hour ?? 8, 0, 0, 0); const day = d.getDay() || 7; d.setDate(d.getDate() + ((8 - day) % 7 || 7)); periodDeadline = d.toISOString() }

    // Вставляем только тех, у кого назначения на ЭТОТ период ещё нет —
    // уникальный индекс (task_id, user_id, period_key) на всякий случай
    // подстрахует от дублирования при параллельном запуске, но дешевле
    // сначала просто проверить.
    const { data: existing } = await a.from('task_assignments')
      .select('user_id').eq('task_id', task.id).eq('period_key', periodKey)
    const already = new Set((existing || []).map(x => x.user_id))
    const toInsert = targetUserIds.filter(id => !already.has(id))
    if (toInsert.length) {
      const { error: insErr } = await a.from('task_assignments').insert(
        toInsert.map(userId => ({ task_id: task.id, user_id: userId, status: 'assigned', period_key: periodKey, deadline_at: periodDeadline }))
      )
      if (!insErr) {
        periodsGenerated += toInsert.length
        await a.from('notifications').insert(
          toInsert.map(userId => ({ user_id: userId, message: `Новое задание: «${task.title}»`, link: '/tasks' }))
        )
      }
    }

    // Незавершённые назначения ПРОШЛЫХ периодов этого же задания —
    // помечаем missed, а не оставляем висеть в assigned навсегда (иначе
    // счётчик «активных заданий» бесконтрольно растёт, и в аналитике
    // не будет видно, что сотрудник период просто пропустил).
    await a.from('task_assignments')
      .update({ status: 'missed' })
      .eq('task_id', task.id).neq('period_key', periodKey).not('period_key', 'is', null)
      .in('status', ['assigned', 'in_progress'])
  }

  // 1) Напоминания (дедлайн в течение 24ч, ещё не напоминали)
  const { data: remind } = await a.from('task_assignments')
    .select('id, task_id, user_id, deadline_at, tasks(title, company_id)')
    .in('status', ['assigned', 'in_progress'])
    .not('deadline_at', 'is', null)
    .is('deadline_reminded_at', null)
    .lte('deadline_at', soon.toISOString()).gte('deadline_at', now.toISOString())
  for (const r of remind || []) {
    await a.from('notifications').insert([
      { user_id: r.user_id, message: `Скоро истекает срок задания «${r.tasks?.title}» — успейте выполнить!`, link: '/tasks' },
    ])
    const { data: admins } = await a.from('profiles').select('user_id')
      .eq('company_id', r.tasks?.company_id).or('is_company_admin.eq.true,can_review_tasks.eq.true')
    if (admins?.length) {
      await a.from('notifications').insert(admins.map(ad => ({
        user_id: ad.user_id, message: `У сотрудника скоро истекает срок задания «${r.tasks?.title}»`, link: '/company-admin/tasks?tab=review'
      })))
    }
    await a.from('task_assignments').update({ deadline_reminded_at: now.toISOString() }).eq('id', r.id)
  }

  // 2) Архив просроченных заданий.
  // БЫЛО: архивировались только строки task_assignments — сама запись в
  // tasks (is_archived/archived_at) не трогалась вообще. Из-за этого
  // уведомление «задание ушло в архив» уходило всем, а на панели
  // администратора (company-admin/tasks.js, вкладки «Активные»/«Архив», и
  // счётчик активных заданий на дашборде company-admin/index.js) задание
  // как было в «Активных», так там и оставалось — эти места фильтруют
  // именно по tasks.is_archived, а не по статусам назначений. Это и есть
  // баг «уведомление про архив приходит, а задание по факту доступно».
  // Заодно это делало недостижимой кнопку «Восстановить» в архиве — вкладка
  // «Архив» тоже читает tasks.is_archived и была всегда пустой.
  // СТАЛО: источник истины один — дедлайн самой задачи (tasks.deadline_at).
  // Архивируется сразу и задача, и все её ещё не сданные назначения.
  const { data: overdueTasks } = await a.from('tasks')
    .select('id, title, company_id')
    .eq('is_active', true)
    .eq('is_archived', false)
    .not('deadline_at', 'is', null)
    .lt('deadline_at', now.toISOString())

  for (const task of overdueTasks || []) {
    await a.from('tasks').update({ is_archived: true, archived_at: now.toISOString() }).eq('id', task.id)

    const { data: openAssignments } = await a.from('task_assignments')
      .select('id, user_id')
      .eq('task_id', task.id)
      .in('status', ['assigned', 'in_progress'])

    if (openAssignments?.length) {
      await a.from('task_assignments')
        .update({ status: 'archived' })
        .in('id', openAssignments.map(x => x.id))
      await a.from('notifications').insert(openAssignments.map(o => ({
        user_id: o.user_id,
        message: `Срок задания «${task.title}» истёк — оно ушло в архив. Руководитель может восстановить его с новым сроком.`,
        link: '/tasks'
      })))
    }

    const { data: admins } = await a.from('profiles').select('user_id')
      .eq('company_id', task.company_id).or('is_company_admin.eq.true,can_review_tasks.eq.true')
    if (admins?.length) {
      await a.from('notifications').insert(admins.map(ad => ({
        user_id: ad.user_id, message: `Задание «${task.title}» не выполнено в срок и ушло в архив`, link: '/company-admin/tasks'
      })))
    }
  }

  // 3) Авто-зачёт по целям (проверяем сегодняшний день)
  const { data: autoTasks } = await a.from('tasks').select('*')
    .eq('is_auto_goal', true).eq('is_active', true).eq('is_archived', false)
  for (const t of autoTasks || []) {
    const { data: emps } = await a.from('profiles').select('user_id')
      .eq('company_id', t.company_id).eq('is_company_admin', false).is('deleted_at', null)
    const { data: metrics } = await a.from('kpi_metrics').select('*').eq('company_id', t.company_id).eq('is_active', true)
    // Задание может быть привязано к ОДНОМУ конкретному показателю
    // (t.auto_metric_id + t.auto_target_rank, см. migrations/005) — тогда
    // условие «выполнить цель Х на уровне Y» проверяем только по нему, а
    // не по всему набору показателей компании.
    const targetMetric = t.auto_metric_id ? (metrics || []).find(m => m.id === t.auto_metric_id) : null
    for (const emp of emps || []) {
      const { data: granted } = await a.from('task_auto_grants').select('task_id')
        .eq('task_id', t.id).eq('user_id', emp.user_id).eq('grant_date', today).maybeSingle()
      if (granted) continue
      const { data: entries } = await a.from('kpi_entries').select('metric_id, value')
        .eq('user_id', emp.user_id).eq('entry_date', today)
      if (!entries?.length) continue
      const bandByMetric = {}
      entries.forEach(e => {
        const m = (metrics || []).find(x => x.id === e.metric_id)
        if (m) bandByMetric[e.metric_id] = bandFor(e.value, m)
      })
      let ok = false
      if (targetMetric) {
        const band = bandByMetric[targetMetric.id]
        ok = !!band && bandRankOf(targetMetric, band) >= (t.auto_target_rank || 1)
      } else {
        // Режимы «все показатели» / «любой один» — сравнение идёт через
        // bandRankOf конкретного показателя, а не через статический
        // BAND_RANK, чтобы корректно работать и с кастомными порогами.
        // Примечание: 'min'/'mid' здесь используются как ключи стандартного
        // 4-уровневого шаблона — для показателя с полностью кастомными
        // порогами без уровня с таким ключом bandRankOf(m,'min') вернёт 0,
        // и условие станет менее строгим. Для точного таргетинга кастомного
        // показателя используйте привязку к конкретному показателю выше,
        // это и есть её основное назначение.
        const bands = Object.values(bandByMetric)
        if (!bands.length) continue
        const meetsRank = ([metricId, band], minKey) => {
          const m = (metrics || []).find(x => x.id === metricId)
          return m ? bandRankOf(m, band) >= bandRankOf(m, minKey) : false
        }
        const entriesArr = Object.entries(bandByMetric)
        if (t.auto_goal_condition === 'all_min') ok = bands.length === (metrics || []).length && entriesArr.every(e => meetsRank(e, 'min'))
        if (t.auto_goal_condition === 'all_mid') ok = bands.length === (metrics || []).length && entriesArr.every(e => meetsRank(e, 'mid'))
        if (t.auto_goal_condition === 'any_one') ok = entriesArr.some(e => meetsRank(e, 'min'))
      }
      if (!ok) continue
      // Начисляем награду. В task_auto_grants есть unique-индекс на
      // (task_id, user_id, grant_date) — это защищает от дублирования самой
      // записи о гранте, НО раньше ошибка этого insert не проверялась,
      // поэтому при гонке (несколько параллельных вызовов этого эндпоинта,
      // что было возможно ровно потому, что он не был защищён — см. выше)
      // код продолжал начислять кармики независимо от того, успела вставка
      // или упала на дубликате. Теперь начисление идёт, только если именно
      // ЭТОТ вызов реально создал запись о гранте.
      const { error: grantError } = await a.from('task_auto_grants').insert({ task_id: t.id, user_id: emp.user_id, grant_date: today })
      if (grantError) continue
      if (t.reward_karma > 0) {
        const { data: bal } = await a.from('karma_balance').select('balance').eq('user_id', emp.user_id).maybeSingle()
        await a.from('karma_balance').upsert({ user_id: emp.user_id, balance: (bal?.balance || 0) + t.reward_karma }, { onConflict: 'user_id' })
        await a.from('karma_transactions').insert({ user_id: emp.user_id, amount: t.reward_karma, type: 'task_reward', description: `Авто-зачёт: «${t.title}»` })
      }
      // Энергия за выполнение — фиксированные +1, не редактируется
      // (по вашей просьбе от 27 августа 2026). Не полагаюсь на
      // сохранённое t.auto_energy — для заданий, созданных до этого
      // правила, там могут быть старые числа.
      const grantedEnergy = await creditEnergy(a, emp.user_id, 1)
      await a.from('notifications').insert({
        user_id: emp.user_id,
        message: `Авто-зачёт: цель «${t.title}» выполнена! +${t.reward_karma} кармиков, +${grantedEnergy} энергии${grantedEnergy < 1 ? ' (дневной лимит энергии исчерпан)' : ''}`,
        link: '/history'
      })
    }
  }

  // 4) Уведомления о наступлении события плана адаптации/развития (п.8 ТЗ).
  // Раньше сотрудник узнавал о событии, только если сам зашёл на страницу —
  // никакого проактивного напоминания не было. Текст уведомления немного
  // отличается по типу события (тестирование/встреча-ОС/обычное), чтобы
  // сразу было понятно, к чему готовиться.
  const EVENT_NOTICE = {
    test: 'У вас запланировано тестирование',
    feedback: 'Сегодня время обратной связи с руководителем',
    meeting: 'У вас запланирована встреча',
    training: 'Сегодня у вас обучение',
  }
  const { data: activePlans } = await a.from('adaptation_plans').select('id, employee_id, start_date, kind').eq('status', 'active')
  let planEventsNotified = 0
  for (const plan of activePlans || []) {
    const { data: pendingEvents } = await a.from('adaptation_plan_events').select('id, day_number, event_time, title, event_type')
      .eq('plan_id', plan.id).eq('status', 'pending').is('reminded_at', null)
    for (const ev of pendingEvents || []) {
      const evDate = new Date(plan.start_date + 'T00:00:00')
      evDate.setDate(evDate.getDate() + (ev.day_number - 1))
      const [h, m] = (ev.event_time || '09:00').split(':').map(Number)
      evDate.setHours(h || 9, m || 0, 0, 0)
      if (evDate > now) continue
      const notice = EVENT_NOTICE[ev.event_type] || 'Наступило событие плана'
      const planLabel = plan.kind === 'development' ? '/development' : '/onboarding'
      await a.from('notifications').insert({ user_id: plan.employee_id, message: `${notice}: «${ev.title}»`, link: planLabel })
      await a.from('adaptation_plan_events').update({ reminded_at: now.toISOString() }).eq('id', ev.id)
      planEventsNotified++
    }
  }

  // 5) Авто-сбор показателей с внешним источником (п.7 ТЗ).
  // pullAutoValues() была написана заранее, но раньше её нигде не вызывали
  // — источник 'auto' был настроен номинально и никогда сам не срабатывал.
  // Логика начисления — та же, что и при ручном вводе KPI (см.
  // company-admin/kpi/entries.js): пишем в kpi_entries, начисляем только
  // разницу между новым и старым уровнем, чтобы не задваивать награду при
  // повторном срабатывании в один день.
  const { data: autoMetrics } = await a.from('kpi_metrics').select('*').eq('source', 'auto').eq('is_active', true)
  let autoGranted = 0
  for (const metric of autoMetrics || []) {
    let rows = []
    try { rows = await pullAutoValues(metric) } catch (e) { continue }
    if (!rows.length) continue
    const emails = rows.map(r => r.email).filter(Boolean)
    const { data: profiles } = await a.from('profiles').select('user_id, email').eq('company_id', metric.company_id).in('email', emails)
    const byEmail = {}
    ;(profiles || []).forEach(p => { byEmail[p.email] = p })
    for (const row of rows) {
      const profile = byEmail[row.email]
      if (!profile) continue
      const newBand = bandFor(row.value, metric)
      const { data: ex } = await a.from('kpi_entries').select('*').eq('metric_id', metric.id).eq('user_id', profile.user_id).eq('entry_date', today).maybeSingle()
      const oldBand = ex?.granted_band || 'none'
      const improved = bandRankOf(metric, newBand) > bandRankOf(metric, oldBand)
      await a.from('kpi_entries').upsert({
        metric_id: metric.id, user_id: profile.user_id, company_id: metric.company_id,
        value: row.value, entry_date: today, source: 'auto',
        granted_band: improved ? newBand : oldBand
      }, { onConflict: 'metric_id,user_id,entry_date' })
      if (improved) {
        const dE = energyFor(metric, newBand) - energyFor(metric, oldBand)
        const dK = karmaFor(metric, newBand) - karmaFor(metric, oldBand)
        if (dE > 0) { await creditEnergy(a, profile.user_id, dE) }
        if (dK > 0) { const { data: bal } = await a.from('karma_balance').select('balance').eq('user_id', profile.user_id).maybeSingle(); await a.from('karma_balance').upsert({ user_id: profile.user_id, balance: (bal?.balance || 0) + dK }, { onConflict: 'user_id' }); await a.from('karma_transactions').insert({ user_id: profile.user_id, amount: dK, type: 'kpi_bonus', description: `KPI «${metric.name}» (авто): ${newBand}` }) }
        autoGranted++
      }
    }
  }

  res.status(200).json({ ok: true, periodsGenerated, reminded: (remind || []).length, archived: (overdueTasks || []).length, planEventsNotified, autoGranted })
}
