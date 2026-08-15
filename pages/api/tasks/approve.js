import { createClient } from '@supabase/supabase-js'
import { requireAuth, canAccessCompany } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAuth(req, res, { permission: 'can_review_tasks' })
  if (!ctx) return

  const { assignmentId, action } = req.body
  const numericId = parseInt(assignmentId, 10)
  if (!numericId || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Неверные параметры' })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: assignment, error: fetchError } = await supabaseAdmin
    .from('task_assignments')
    .select('id, user_id, task_id, status, tasks( id, title, reward_karma, mastery_reward, purpose, company_id )')
    .eq('id', numericId)
    .single()

  if (fetchError || !assignment) {
    return res.status(404).json({ error: 'Назначение не найдено' })
  }
  if (assignment.status !== 'pending_review') {
    return res.status(400).json({ error: 'Задание уже обработано' })
  }
  if (!canAccessCompany(ctx.profile, assignment.tasks?.company_id)) {
    return res.status(403).json({ error: 'Доступ запрещён: другая компания' })
  }

  const newStatus = action === 'approve' ? 'completed' : 'in_progress'

  const { data: updatedRows, error: updateError } = await supabaseAdmin
    .from('task_assignments')
    .update({ status: newStatus, reviewed_at: new Date().toISOString(), reviewed_by: ctx.user.id })
    .eq('id', numericId)
    .eq('status', 'pending_review')
    .select('id')

  if (updateError) return res.status(500).json({ error: 'Ошибка обновления: ' + updateError.message })
  if (!updatedRows || updatedRows.length === 0) {
    return res.status(409).json({ error: 'Задание уже обработано другим запросом' })
  }

  // --- Кармики (как раньше) ---
  if (action === 'approve' && assignment.tasks.reward_karma > 0) {
    const reward = assignment.tasks.reward_karma
    const { error: transactionError } = await supabaseAdmin
      .from('karma_transactions')
      .insert({ user_id: assignment.user_id, amount: reward, type: 'task_reward', description: 'Выполнено задание: ' + assignment.tasks.title })
    if (transactionError) return res.status(500).json({ error: 'Ошибка транзакции: ' + transactionError.message })
    await supabaseAdmin.from('notifications').insert({
      user_id: assignment.user_id, type: 'task_done',
      message: `Вам начислено ${reward} кармиков за выполнение задания "${assignment.tasks.title}"`, link: '/tasks'
    })
  }

  if (action === 'approve') {
    // === ЭТАП 1: Баллы мастерства + автоповышение уровня ===
    const masteryReward = assignment.tasks.mastery_reward || 0
    if (masteryReward > 0) {
      const { data: mastery } = await supabaseAdmin
        .from('employee_mastery').select('mastery_total, current_level')
        .eq('user_id', assignment.user_id).maybeSingle()
      const oldLevel = mastery?.current_level || 1
      const newTotal = (mastery?.mastery_total || 0) + masteryReward
      const { data: newLevel } = await supabaseAdmin.rpc('compute_mastery_level', { p_mastery: newTotal })
      const lvl = newLevel || oldLevel
      const levelUp = lvl > oldLevel
      await supabaseAdmin.from('employee_mastery').upsert({
        user_id: assignment.user_id,
        mastery_total: newTotal,
        current_level: lvl,
        updated_at: new Date().toISOString(),
        ...(levelUp ? { achieved_at: new Date().toISOString() } : {})
      }, { onConflict: 'user_id' })
      if (levelUp) {
        const { data: levelInfo } = await supabaseAdmin
          .from('mastery_levels').select('title').eq('level', lvl).single()
        await supabaseAdmin.from('notifications').insert({
          user_id: assignment.user_id, type: 'level_up',
          message: `Новый уровень мастерства: «${levelInfo?.title || 'Уровень ' + lvl}». Так держать!`, link: '/goals'
        })
      }
    }

    // === ЭТАП 3: Задание для руководителя (ОС новичку) ===
    if (assignment.tasks.purpose === 'test') {
      const { data: employeeProfile } = await supabaseAdmin
        .from('profiles').select('manager_id, company_id, display_name, email')
        .eq('user_id', assignment.user_id).single()
      if (employeeProfile?.manager_id) {
        const employeeName = employeeProfile.display_name || employeeProfile.email || 'сотрудник'
        const { data: fbTask, error: fbTaskError } = await supabaseAdmin
          .from('tasks')
          .insert({
            company_id: employeeProfile.company_id,
            title: `Дать обратную связь: ${assignment.tasks.title}`,
            description: `${employeeName} выполнил тестовое задание "${assignment.tasks.title}". Дайте обратную связь, чтобы он мог двигаться дальше.`,
            reward_karma: 5, mastery_reward: 2, task_type: 'one_time',
            purpose: 'manager_feedback', requires_review: false, is_active: true, created_by: ctx.user.id
          }).select().single()
        if (!fbTaskError && fbTask) {
          await supabaseAdmin.from('task_assignments').insert({ task_id: fbTask.id, user_id: employeeProfile.manager_id, status: 'assigned' })
          await supabaseAdmin.from('notifications').insert({
            user_id: employeeProfile.manager_id, type: 'feedback_requested',
            message: `${employeeName} ждёт вашу обратную связь по заданию "${assignment.tasks.title}"`, link: '/tasks'
          })
        }
      }
    }

    // === ЭТАП 3: Прогресс адаптации ===
    const { data: stepTask } = await supabaseAdmin
      .from('onboarding_step_tasks')
      .select('step_id, onboarding_steps(plan_id)')
      .eq('task_id', assignment.task_id).maybeSingle()
    const planId = stepTask?.onboarding_steps?.plan_id
    if (planId) {
      const { data: onboarding } = await supabaseAdmin
        .from('employee_onboarding').select('id, current_step, status')
        .eq('employee_id', assignment.user_id).eq('plan_id', planId)
        .eq('status', 'in_progress').maybeSingle()
      if (onboarding) {
        const { data: steps } = await supabaseAdmin
          .from('onboarding_steps').select('id, sort_order')
          .eq('plan_id', planId).order('sort_order')
        const sortedSteps = steps || []
        const currentStepRow = sortedSteps[onboarding.current_step]
        if (currentStepRow) {
          const { data: stepTasks } = await supabaseAdmin
            .from('onboarding_step_tasks').select('task_id').eq('step_id', currentStepRow.id)
          const stepTaskIds = (stepTasks || []).map(st => st.task_id)
          if (stepTaskIds.length > 0) {
            const { data: completions } = await supabaseAdmin
              .from('task_assignments').select('task_id, status')
              .eq('user_id', assignment.user_id).in('task_id', stepTaskIds)
            const doneCount = (completions || []).filter(c => c.status === 'completed').length
            if (doneCount >= stepTaskIds.length) {
              const nextStep = onboarding.current_step + 1
              const isFinished = nextStep >= sortedSteps.length
              await supabaseAdmin.from('employee_onboarding').update({
                current_step: isFinished ? onboarding.current_step : nextStep,
                status: isFinished ? 'completed' : 'in_progress',
                completed_at: isFinished ? new Date().toISOString() : null,
                progress: Math.min(100, Math.round((nextStep / sortedSteps.length) * 100))
              }).eq('id', onboarding.id)
              if (isFinished) {
                await supabaseAdmin.from('notifications').insert({
                  user_id: assignment.user_id, type: 'onboarding_done',
                  message: 'Поздравляем! Вы завершили план адаптации.', link: '/onboarding'
                })
              } else {
                const nextStepRow = sortedSteps[nextStep]
                const { data: nextStepTasks } = await supabaseAdmin
                  .from('onboarding_step_tasks').select('task_id').eq('step_id', nextStepRow.id)
                const nextAssignments = (nextStepTasks || []).map(nst => ({ task_id: nst.task_id, user_id: assignment.user_id, status: 'assigned' }))
                if (nextAssignments.length > 0) await supabaseAdmin.from('task_assignments').insert(nextAssignments)
                await supabaseAdmin.from('notifications').insert({
                  user_id: assignment.user_id, type: 'onboarding_step',
                  message: `Адаптация: открыт шаг ${nextStep + 1}. Новые задания уже в списке!`, link: '/onboarding'
                })
              }
            }
          }
        }
      }
    }
  }

  await supabaseAdmin.from('audit_logs').insert({
    user_id: ctx.user.id,
    action: action === 'approve' ? 'task_approved' : 'task_rejected',
    entity_type: 'task', entity_id: assignmentId.toString(),
    details: { target_user_id: assignment.user_id, reward: assignment.tasks.reward_karma }
  })

  res.status(200).json({ result: 'OK' })
}
