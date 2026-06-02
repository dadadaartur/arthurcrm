import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // 1. Проверяем администратора по токену
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = authHeader.split(' ')[1]

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { user: adminUser }, error: tokenError } = await supabaseAdmin.auth.getUser(token)
  if (tokenError || !adminUser) return res.status(401).json({ error: 'Invalid token' })

  // Проверяем, что это действительно админ (роль 1 или 2)
  const { data: adminProfile } = await supabaseAdmin
    .from('profiles')
    .select('company_id, role_id')
    .eq('user_id', adminUser.id)
    .single()

  if (!adminProfile || (adminProfile.role_id !== 1 && adminProfile.role_id !== 2)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // 2. Создаём задание
  const { title, description, rewardKarma, taskType, frequency, targetRole, minEnergyLevel, requiresReview, deadlineHours } = req.body
  if (!title || !description) return res.status(400).json({ error: 'Title and description required' })

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

  // 3. Получаем всех сотрудников компании (через auth.admin.listUsers для точных user_id)
  const { data: { users: allUsers }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
  if (usersError) return res.status(500).json({ error: 'Failed to fetch users' })

  // Получаем профили сотрудников (не админов) этой компании
  const { data: employeesProfiles } = await supabaseAdmin
    .from('profiles')
    .select('user_id, email')
    .eq('company_id', adminProfile.company_id)
    .not('role_id', 'in', '(1,2)')

  if (!employeesProfiles || employeesProfiles.length === 0) {
    return res.status(200).json({ task, assigned: 0, message: 'Нет сотрудников для назначения' })
  }

  // Для каждого профиля находим его реальный auth.uid (по email)
  const assignments = []
  for (const profile of employeesProfiles) {
    const authUser = allUsers.find(u => u.email === profile.email)
    if (authUser) {
      assignments.push({
        task_id: task.id,
        user_id: authUser.id, // правильный auth.uid
        status: 'assigned',
        deadline_at: deadlineHours ? new Date(Date.now() + deadlineHours * 3600000).toISOString() : null
      })
    }
  }

  if (assignments.length > 0) {
    const { error: assignError } = await supabaseAdmin.from('task_assignments').insert(assignments)
    if (assignError) {
      await supabaseAdmin.from('tasks').delete().eq('id', task.id)
      return res.status(500).json({ error: 'Assignment failed: ' + assignError.message })
    }
  }

  return res.status(200).json({ task, assigned: assignments.length })
}
