import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { assignmentId, action } = req.body
  const numericId = parseInt(assignmentId, 10)

  if (!numericId || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Неверные параметры' })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Вызываем нашу новую функцию, которая обходит RLS
  const { data, error } = await supabaseAdmin.rpc('finalize_task_review', {
    assignment_id: numericId,
    action: action
  })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  if (data !== 'OK') {
    return res.status(400).json({ error: data })   // например "Задание не на проверке"
  }

  res.status(200).json({ result: 'OK' })
}
