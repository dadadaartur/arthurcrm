import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  // 1. Находим просроченные назначения (статус assigned или in_progress, дедлайн < now)
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

  if (!overdueAssignments || overdueAssignments.length === 0) {
    return res.status(200).json({ ok: true, archived: 0, tasksArchived: 0 })
  }

  // 2. Архивируем просроченные назначения
  const assignmentIds = overdueAssignments.map(a => a.id)
  const { error: updateError } = await supabaseAdmin
    .from('task_assignments')
    .update({ status: 'archived' })
    .in('id', assignmentIds)

  if (updateError) {
    console.error('[check-deadlines] ошибка архивации назначений:', updateError)
    return res.status(500).json({ error: updateError.message })
  }

  // 3. Для каждой задачи проверяем, остались ли активные назначения
  const taskIds = [...new Set(overdueAssignments.map(a => a.task_id))]
  const tasksToArchive = []

  for (const taskId of taskIds) {
    const { data: activeAssignments, error: activeError } = await supabaseAdmin
      .from('task_assignments')
      .select('id')
      .eq('task_id', taskId)
      .in('status', ['assigned', 'in_progress', 'pending_review'])
      .limit(1) // достаточно проверить наличие хотя бы одного

    if (activeError) {
      console.error(`[check-deadlines] ошибка проверки активных назначений для задачи ${taskId}:`, activeError)
      continue
    }

    // Если нет активных назначений — архивируем задачу
    if (!activeAssignments || activeAssignments.length === 0) {
      tasksToArchive.push(taskId)
    }
  }

  // 4. Архивируем задачи
  let tasksArchivedCount = 0
  if (tasksToArchive.length > 0) {
    const { error: taskUpdateError } = await supabaseAdmin
      .from('tasks')
      .update({ is_archived: true, archived_at: now.toISOString() })
      .in('id', tasksToArchive)

    if (taskUpdateError) {
      console.error('[check-deadlines] ошибка архивации задач:', taskUpdateError)
      // Не возвращаем ошибку, т.к. назначения уже заархивированы
    } else {
      tasksArchivedCount = tasksToArchive.length
    }
  }

  // 5. Отправляем уведомления сотрудникам (как раньше)
  for (const assignment of overdueAssignments) {
    // Получаем информацию о задаче
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

      // Уведомляем админов компании
      const { data: admins } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('company_id', task.company_id)
        .or('is_company_admin.eq.true,can_review_tasks.eq.true')

      if (admins && admins.length > 0) {
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

  res.status(200).json({
    ok: true,
    archivedAssignments: assignmentIds.length,
    tasksArchived: tasksArchivedCount
  })
}
