import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAuth(req, res, { allowedRoles: [1, 2] })
  if (!auth) return

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { title, description, rewardKarma, taskType, frequency, targetRole, minEnergyLevel, requiresReview, deadlineHours } = req.body

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      company_id: auth.profile.company_id,
      title,
      description,
      reward_karma: rewardKarma,
      task_type: taskType,
      frequency,
      target_role: targetRole,
      min_energy_level: minEnergyLevel || 0,
      requires_review: requiresReview,
      deadline_hours: deadlineHours,
      created_by: auth.user.id
    })
    .select()

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json(data[0])
}
