import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Проверяем админа по токену из заголовка
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ error: 'Unauthorized' })
  const token = authHeader.split(' ')[1]

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { user }, error: tokenErr } = await supabaseAdmin.auth.getUser(token)
  if (tokenErr || !user) return res.status(401).json({ error: 'Invalid token' })

  const { assignmentId, action } = req.body
  if (!assignmentId || !['approve', 'reject'].includes(action))
    return res.status(400).json({ error: 'Invalid params' })

  // Вызываем нашу хранимую функцию, передавая assignmentId как число
  const { data, error } = await supabaseAdmin.rpc('approve_assignment_v2', {
    assignment_id: Number(assignmentId),
    action
  })

  if (error) return res.status(500).json({ error: error.message })

  res.status(200).json({ result: data })
}
