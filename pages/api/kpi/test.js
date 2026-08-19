import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'
export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const { trainingId, answers } = req.body
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: t } = await sb.from('kpi_trainings').select('*').eq('id', trainingId).maybeSingle()
  if (!t) return res.status(404).json({ error: 'Тест не найден' })
  const qs = t.test_questions || []
  let correct = 0
  qs.forEach((q, i) => { if (answers?.[i] === q.correct) correct++ })
  const score = qs.length ? Math.round((correct / qs.length) * 100) : 0
  const passed = score >= 70
  await sb.from('kpi_test_results').insert({ training_id: trainingId, user_id: ctx.user.id, score, passed })
  if (passed) {
    const { data: bal } = await sb.from('karma_balance').select('balance').eq('user_id', ctx.user.id).maybeSingle()
    await sb.from('karma_balance').upsert({ user_id: ctx.user.id, balance: (bal?.balance || 0) + 2 }, { onConflict: 'user_id' })
    await sb.from('karma_transactions').insert({ user_id: ctx.user.id, amount: 2, type: 'kpi_bonus', description: `Тест «${t.title}» пройден` })
  }
  res.status(200).json({ score, passed })
}
