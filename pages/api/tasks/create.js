import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Проверка токена админа
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = authHeader.split(' ')[1]

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user: adminUser }, error: tokenError } = await supabaseAdmin.auth.getUser(token)
  if (tokenError || !adminUser) return res.status(401).json({ error: 'Invalid token' })

  // Проверяем, что админ — действительно администратор
  const { data: adminProfile } = await supabaseAdmin
    .from('profiles')
    .select('company_id, role_id')
    .eq('user_id', adminUser.id)
    .single()

  if (!adminProfile || (adminProfile.role_id !== 1 && adminProfile.role_id !== 2)) {
    return res.status(403).json({ error: 'Forbidden: only admins can create tasks' })
  }

  const { title, description, rewardKarma, taskType, frequency, targetRole, minEnergyLevel, requiresReview, deadlineHours } = req.body

  if (!title || !description) return res.status(400).json({ error: 'Title and description required' })

  // Создаём задание
  const { data: task, error: taskError } = await supabaseAdmin
    .from('tasks')
    .insert({
      company_id: adminProfile.company_id,
      title,
      description,
      reward_karma: rewardKarma || 0,
      task_type: taskType || 'one_time',
      frequency: frequency || 'once',
      target_role: targetRole || 'all',
      min_energy_level: minEnergyLevel || 0,
      requires_review: requiresReview || false,
      deadline_hours: deadlineHours ? Number(deadlineHours) : null,
      created_by: adminUser.id,
      is_active: true
    })
    .select()
    .single()

  if (taskError) return res.status(500).json({ error: taskError.message })

  // Получаем сотрудников компании (все, кроме админов)
  const { data: employees } = await supabaseAdmin
    .from('profiles')
    .select('user_id')
    .eq('company_id', adminProfile.company_id)
    .not('role_id', 'in', '(1,2)')
    .not('user_id', 'is', null)

  if (employees && employees.length > 0) {
    // Вставляем назначения с правильными user_id из profiles
    const assignments = employees.map(emp => ({
      task_id: task.id,
      user_id: emp.user_id,
      status: 'assigned',
      deadline_at: deadlineHours ? new Date(Date.now() + deadlineHours * 3600000).toISOString() : null
    }))

    const { error: assignError } = await supabaseAdmin.from('task_assignments').insert(assignments)
    if (assignError) {
      // Откатываем задание, если не смогли назначить
      await supabaseAdmin.from('tasks').delete().eq('id', task.id)
      return res.status(500).json({ error: 'Assignment failed: ' + assignError.message })
    }

    return res.status(200).json({ task, assigned: employees.length })
  }

  return res.status(200).json({ task, assigned: 0 })
}
