import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Проверяем авторизацию через токен (админ должен быть залогинен)
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = authHeader.split(' ')[1]

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Получаем пользователя по токену
  const { data: { user: adminUser }, error: tokenError } = await supabaseAdmin.auth.getUser(token)
  if (tokenError || !adminUser) return res.status(401).json({ error: 'Invalid token' })

  // Проверяем, что это действительно админ (role_id 1 или 2)
  const { data: adminProfile } = await supabaseAdmin
    .from('profiles')
    .select('company_id, role_id')
    .eq('user_id', adminUser.id)
    .single()

  if (!adminProfile || (adminProfile.role_id !== 1 && adminProfile.role_id !== 2)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { assignmentId, action } = req.body
  if (!assignmentId || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid request' })
  }

  // Получаем назначение с задачей
  const { data: assignment, error: fetchError } = await supabaseAdmin
    .from('task_assignments')
    .select('id, user_id, task_id, status, tasks( id, company_id, reward_karma, requires_review )')
    .eq('id', assignmentId)
    .single()

  if (fetchError || !assignment) return res.status(404).json({ error: 'Assignment not found' })
  if (assignment.status !== 'pending_review') return res.status(400).json({ error: 'Assignment is not pending review' })
  if (assignment.tasks.company_id !== adminProfile.company_id) return res.status(403).json({ error: 'Wrong company' })

  const newStatus = action === 'approve' ? 'completed' : 'in_progress' // при отклонении возвращаем в работу
  const updateData = {
    status: newStatus,
    reviewed_by: adminUser.id,
    reviewed_at: new Date().toISOString()
  }

  const { error: updateError } = await supabaseAdmin
    .from('task_assignments')
    .update(updateData)
    .eq('id', assignmentId)

  if (updateError) return res.status(500).json({ error: updateError.message })

  // Начисляем кармики только при одобрении
  if (action === 'approve') {
    const reward = assignment.tasks?.reward_karma || 0
    if (reward > 0) {
      // Транзакция
      await supabaseAdmin.from('karma_transactions').insert({
        user_id: assignment.user_id,
        amount: reward,
        type: 'task_reward',
        description: 'Выполнено задание: ' + assignment.tasks.title
      })
      // Обновление баланса
      const { data: balanceRow } = await supabaseAdmin
        .from('karma_balance')
        .select('balance')
        .eq('user_id', assignment.user_id)
        .single()
      const newBalance = (balanceRow?.balance || 0) + reward
      await supabaseAdmin
        .from('karma_balance')
        .upsert({ user_id: assignment.user_id, balance: newBalance }, { onConflict: 'user_id' })
    }
  }

  res.status(200).json({ success: true, newStatus })
}
