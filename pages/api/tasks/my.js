import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Получаем пользователя из Supabase-сессии (куки автоматически передаются)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return res.status(200).json([]) // не авторизован – пустой список
  }

  const { data, error } = await supabase
    .from('task_assignments')
    .select('id, status, started_at, deadline_at, tasks( id, title, description, reward_karma, task_type, deadline_hours, requires_review )')
    .eq('user_id', user.id)
    .in('status', ['assigned', 'in_progress', 'pending_review'])
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json(data || [])
}
