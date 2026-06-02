import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Получаем пользователя из кук, но не требуем строгой сессии – просто для идентификации
  const { data: { user } } = await supabase.auth.getUser(req.headers.cookie?.split(';').find(c => c.trim().startsWith('sb-'))?.split('=')[1]?.trim())

  if (!user) {
    // Если не можем получить, всё равно вернём пустой массив
    return res.status(200).json([])
  }

  const { data, error } = await supabase
    .from('task_assignments')
    .select('id, status, started_at, deadline_at, tasks( id, title, description, reward_karma, task_type, deadline_hours, requires_review )')
    .eq('user_id', user.id)
    .in('status', ['assigned', 'in_progress', 'pending_review'])
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data || [])
}
