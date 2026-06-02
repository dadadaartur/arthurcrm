import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAuth(req, res, { allowedRoles: [1, 2] }) // только админы
  if (!auth) return

  const { title, description, rewardKarma, taskType, frequency, targetRole, minEnergyLevel, requiresReview, deadlineHours } = req.body

  if (!title || !description) {
    return res.status(400).json({ error: 'Название и описание обязательны' })
  }

  const serviceClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // 1. Создаём задание
  const { data: task, error: taskError } = await serviceClient
    .from('tasks')
    .insert({
      company_id: auth.profile.company_id,
      title,
      description,
      reward_karma: rewardKarma || 0,
      task_type: taskType || 'one_time',
      frequency: frequency || 'once',
      target_role: targetRole || 'all',
      min_energy_level: minEnergyLevel || 0,
      requires_review: requiresReview || false,
      deadline_hours: deadlineHours ? Number(deadlineHours) : null,
      created_by: auth.user.id,
      is_active: true
    })
    .select()
    .single()

  if (taskError) return res.status(500).json({ error: taskError.message })

  // 2. Получаем сотрудников компании, которым нужно назначить задание
  // Пока назначаем всем, у кого role_id != 1 и != 2 (не админы)
  // В будущем можно учесть targetRole (new/experienced), если добавим поле опыта
  const { data: employees, error: empError } = await serviceClient
    .from('profiles')
    .select('user_id')
    .eq('company_id', auth.profile.company_id)
    .not('role_id', 'in', '(1,2)') // исключаем суперадмина и админа компании
    .not('user_id', 'is', null)

  if (empError) {
    // Если сотрудников не нашли, просто возвращаем задание без назначений
    return res.status(200).json({ task, assigned: 0 })
  }

  if (employees && employees.length > 0) {
    // Создаём назначения
    const assignments = employees.map(emp => ({
      task_id: task.id,
      user_id: emp.user_id,
      status: 'assigned',
      assigned_by: auth.user.id,
      deadline_at: deadlineHours ? new Date(Date.now() + deadlineHours * 3600000).toISOString() : null
    }))

    const { error: assignError } = await serviceClient
      .from('task_assignments')
      .insert(assignments)

    if (assignError) {
      // Если ошибка, удаляем задание, чтобы не было осиротевшего
      await serviceClient.from('tasks').delete().eq('id', task.id)
      return res.status(500).json({ error: 'Ошибка назначения: ' + assignError.message })
    }

    return res.status(200).json({ task, assigned: employees.length })
  }

  res.status(200).json({ task, assigned: 0 })
}
