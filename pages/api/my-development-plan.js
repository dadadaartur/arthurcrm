import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/auth'

// Мой план развития (по запросу от 6 сентября 2026: «результаты
// тренингов и тестов нужно вынести отдельным модулем в план
// адаптации/развития») — тот же принцип, что уже был у админской
// версии страницы, но для просмотра СОБСТВЕННЫХ действий никакое
// специальное право не нужно, только быть собой.
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const userId = ctx.user.id

  const [{ data: actions }, { data: testAttempts }, { data: trainingViews }] = await Promise.all([
    a.from('development_actions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    a.from('test_attempts').select('*').eq('user_id', userId).not('completed_at', 'is', null).order('completed_at', { ascending: false }),
    a.from('training_views').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
  ])

  res.status(200).json({ actions: actions || [], testResults: testAttempts || [], trainingResults: trainingViews || [] })
}
