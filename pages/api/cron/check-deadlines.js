import { createClient } from '@supabase/supabase-js'
import { bandFor, BAND_RANK, energyFor, karmaFor } from '../../../lib/kpi'

export default async function handler(req, res) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  // 1. Обработка просроченных заданий (архивация) – без изменений
  const { data: overdueAssignments, error: findError } = await supabaseAdmin
    .from('task_assignments')
    .select('id, task_id, user_id')
    .in('status', ['assigned', 'in_progress'])
    .not('deadline_at', 'is', null)
    .lt('deadline_at', now.toISOString())

  if (findError) {
    console.error('[check-deadlines] ошибка поиска просроченных:', findError)
    return res.status(500).json({ error: findError.message })
  }

  if (overdueAssignments && overdueAssignments.length > 0) {
    const assignmentIds = overdueAssignments.map(a => a.id)
    await supabaseAdmin
      .from('task_assignments')
      .update({ status: 'archived' })
      .in('id', assignmentIds)

    // Архивация самих заданий, если нет активных назначений
    const taskIds = [...new Set(overdueAssignments.map(a => a.task_id))]
    for (const taskId of taskIds) {
      const { data: activeAssignments } = await supabaseAdmin
        .from('task_assignments')
        .select('id')
        .eq('task_id', taskId)
        .in('status', ['assigned', 'in_progress', 'pending_review'])
        .limit(1)

      if (!activeAssignments || activeAssignments.length === 0) {
        await supabaseAdmin
          .from('tasks')
          .update({ is_archived: true, archived_at: now.toISOString() })
          .eq('id', taskId)
      }
    }

    // Уведомления (как раньше)
    for (const assignment of overdueAssignments) {
      const { data: task } = await supabaseAdmin
        .from('tasks')
        .select('title, company_id')
        .eq('id', assignment.task_id)
        .single()
      if (task) {
        await supabaseAdmin.from('notifications').insert({
          user_id: assignment.user_id,
          message: `Срок задания «${task.title}» истёк — оно ушло в архив. Руководитель может восстановить его с новым сроком.`,
          link: '/tasks'
        })
        const { data: admins } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('company_id', task.company_id)
          .or('is_company_admin.eq.true,can_review_tasks.eq.true')
        if (admins && admins.length) {
          await supabaseAdmin.from('notifications').insert(
            admins.map(admin => ({
              user_id: admin.user_id,
              message: `Задание «${task.title}» не выполнено в срок и ушло в архив.`,
              link: '/company-admin/tasks'
            }))
          )
        }
      }
    }
  }

  // 2. Авто-зачёт по целям (новая логика)
  // Получаем все активные авто-задания
  const { data: autoTasks, error: autoError } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('is_auto_goal', true)
    .eq('is_active', true)
    .eq('is_archived', false)

  if (autoError) {
    console.error('[check-deadlines] ошибка получения авто-заданий:', autoError)
    return res.status(500).json({ error: autoError.message })
  }

  if (!autoTasks || autoTasks.length === 0) {
    return res.status(200).json({ ok: true })
  }

  // Группируем по компаниям для оптимизации
  const companyIds = [...new Set(autoTasks.map(t => t.company_id))]
  for (const companyId of companyIds) {
    const companyTasks = autoTasks.filter(t => t.company_id === companyId)

    // Получаем всех сотрудников компании (не админов)
    const { data: employees } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('company_id', companyId)
      .eq('is_company_admin', false)
      .is('deleted_at', null)

    if (!employees || employees.length === 0) continue

    // Получаем метрики компании
    const { data: metrics } = await supabaseAdmin
      .from('kpi_metrics')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)

    const metricMap = {}
    metrics?.forEach(m => { metricMap[m.id] = m })

    // Получаем сегодняшние записи KPI для всех сотрудников
    const userIds = employees.map(e => e.user_id)
    const { data: entries } = await supabaseAdmin
      .from('kpi_entries')
      .select('*')
      .in('user_id', userIds)
      .eq('entry_date', today)

    // Группируем записи по user_id
    const entriesByUser = {}
    entries?.forEach(e => {
      if (!entriesByUser[e.user_id]) entriesByUser[e.user_id] = []
      entriesByUser[e.user_id].push(e)
    })

    // Для каждого авто-задания проверяем каждого сотрудника
    for (const task of companyTasks) {
      for (const emp of employees) {
        const userId = emp.user_id
        const userEntries = entriesByUser[userId] || []

        // Проверяем, не было ли уже начисления сегодня для этого задания и пользователя
        const { data: existingGrant } = await supabaseAdmin
          .from('task_auto_grants')
          .select('id')
          .eq('task_id', task.id)
          .eq('user_id', userId)
          .eq('grant_date', today)
          .maybeSingle()

        if (existingGrant) continue // уже начислено сегодня

        let conditionMet = false

        if (task.auto_metric_id) {
          // Новый тип: привязка к конкретной метрике и уровню
          const metric = metricMap[task.auto_metric_id]
          if (metric) {
            const entry = userEntries.find(e => e.metric_id === task.auto_metric_id)
            if (entry) {
              const band = bandFor(entry.value, metric)
              const requiredRank = BAND_RANK[task.auto_required_band] || 0
              conditionMet = BAND_RANK[band] >= requiredRank
            }
          }
        } else {
          // Старый тип: общее условие по всем метрикам
          const bands = userEntries.map(e => {
            const m = metricMap[e.metric_id]
            return m ? bandFor(e.value, m) : null
          }).filter(Boolean)

          if (task.auto_goal_condition === 'all_min') {
            conditionMet = bands.every(b => BAND_RANK[b] >= BAND_RANK.min)
          } else if (task.auto_goal_condition === 'all_mid') {
            conditionMet = bands.every(b => BAND_RANK[b] >= BAND_RANK.mid)
          } else if (task.auto_goal_condition === 'any_one') {
            conditionMet = bands.some(b => BAND_RANK[b] >= BAND_RANK.min)
          }
        }

        if (conditionMet) {
          // Начисляем награду
          const karmaReward = task.reward_karma || 0
          const energyReward = task.auto_energy || 0

          // Записываем факт начисления (уникальность по task+user+date)
          await supabaseAdmin.from('task_auto_grants').insert({
            task_id: task.id,
           
