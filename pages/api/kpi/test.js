import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../../lib/auth'
import { creditEnergy } from '../../../lib/energy'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { trainingId, answers } = req.body || {}
  const { data: t } = await a.from('kpi_trainings').select('*').eq('id', trainingId).maybeSingle()
  if (!t) return res.status(404).json({ error: 'Тренинг не найден' })
  const qs = t.test_questions || []
  if (!qs.length) return res.status(400).json({ error: 'У тренинга нет вопросов' })
  let correct = 0
  qs.forEach((q, i) => { if ((answers || [])[i] === q.correct) correct++ })
  const score = Math.round((correct / qs.length) * 100)
  const passed = score >= 70

  await a.from('kpi_test_results').insert({ user_id: ctx.user.id, training_id: trainingId, score, passed })
  // Дублируем в test_attempts, чтобы аналитика тестов видела попытку
  if (t.test_id) {
    await a.from('test_attempts').insert({ user_id: ctx.user.id, test_id: t.test_id, score, total_points: qs.length * 10, is_passed: passed, completed_at: new Date().toISOString() })
  }
  if (passed) {
    const { data: bal } = await a.from('karma_balance').select('balance').eq('user_id', ctx.user.id).maybeSingle()
    await a.from('karma_balance').upsert({ user_id: ctx.user.id, balance: (bal?.balance || 0) + 2 }, { onConflict: 'user_id' })
    await a.from('karma_transactions').insert({ user_id: ctx.user.id, amount: 2, type: 'test_reward', description: `Тест «${t.title}» сдан (${score}%)` })
    await creditEnergy(a, ctx.user.id, 5)
  }
  res.status(200).json({ score, passed })
}
