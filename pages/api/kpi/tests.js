import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../lib/auth'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] } return r }

async function saveQuestions(a, testId, questions) {
  let order = 0
  for (const q of questions || []) {
    const { data: qrow } = await a.from('questions').insert({
      test_id: testId, type: q.type || 'single', text: q.text, difficulty: q.difficulty || 1,
      points: q.points || 10, correct_text: q.correct_text || null, media_url: q.media_url || null, sort_order: order++
    }).select().single()
    if (qrow && q.options?.length) {
      await a.from('answer_options').insert(q.options.map((o, i) => ({ question_id: qrow.id, text: o.text, is_correct: !!o.is_correct, sort_order: i })))
    }
  }
}

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = sb()
  const action = req.query.action
  const companyId = ctx.profile?.company_id
  const isAdmin = ctx.profile?.is_company_admin || hasPermission(ctx.profile, 'can_manage_employees')

  if (action === 'list' && req.method === 'GET') {
    const { data } = await a.from('tests').select('*').eq('company_id', companyId).eq('is_active', true).order('created_at', { ascending: false })
    const out = []
    for (const t of data || []) {
      const { count } = await a.from('questions').select('id', { count: 'exact', head: true }).eq('test_id', t.id)
      const { data: atts } = await a.from('test_attempts').select('score, is_passed').eq('test_id', t.id)
      const done = (atts || []).filter(x => x.is_passed != null)
      out.push({ ...t, question_count: count || 0, attempts_count: (atts || []).length, pass_rate: done.length ? Math.round(done.filter(x => x.is_passed).length / done.length * 100) : 0 })
    }
    return res.status(200).json(out)
  }

  if (action === 'get' && req.method === 'GET') {
    const id = req.query.id
    const mode = req.query.mode || 'take'
    const { data: t } = await a.from('tests').select('*').eq('id', id).maybeSingle()
    if (!t) return res.status(404).json({ error: 'Тест не найден' })
    // РАНЬШЕ: 'edit' была единственной проверкой того, отдавать ли
    // is_correct у вариантов ответа — но опции ниже НЕ исключали
    // correct_text (правильный ответ для вопросов типа "fill"), он
    // приезжал через {...q} в любом режиме, включая обычный запуск теста.
    // Технически подкованный сотрудник видел правильный ответ на fill-
    // вопросы в сетевом ответе ДО того, как пройдёт тест. Теперь
    // correct_text тоже вырезается вне режима edit, а mode='edit' к тому
    // же требует прав администратора (см. ниже).
    if (mode === 'edit' && !isAdmin) return res.status(403).json({ error: 'Недостаточно прав' })
    const { data: qs } = await a.from('questions').select('*').eq('test_id', id).order('sort_order')
    const questions = []
    for (const q of qs || []) {
      const { data: opts } = await a.from('answer_options').select('*').eq('question_id', q.id).order('sort_order')
      if (mode === 'edit') {
        questions.push({ ...q, options: opts || [] })
      } else {
        const { correct_text, ...safeQ } = q
        questions.push({ ...safeQ, options: (opts || []).map(o => ({ id: o.id, text: o.text, sort_order: o.sort_order })) })
      }
    }
    return res.status(200).json({ ...t, questions: mode === 'edit' ? questions : (t.is_random ? shuffle(questions) : questions) })
  }

  if (action === 'create' && req.method === 'POST') {
    if (!isAdmin) return res.status(403).json({ error: 'Недостаточно прав' })
    const b = req.body
    const { data: t, error } = await a.from('tests').insert({
      company_id: companyId, training_id: b.training_id || null, title: b.title, description: b.description || '',
      video_url: b.video_url || null, time_limit: b.time_limit || 10, passing_score: b.passing_score || 70,
      attempts_allowed: b.attempts_allowed || 3, is_random: b.is_random !== false, show_correct_answers: b.show_correct_answers !== false,
      energy_reward: b.energy_reward || 0, karma_reward: b.karma_reward || 0
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    await saveQuestions(a, t.id, b.questions || [])
    if (b.training_id) await a.from('kpi_trainings').update({ test_id: t.id }).eq('id', b.training_id)
    const { data: emps } = await a.from('profiles').select('user_id').eq('company_id', companyId).is('deleted_at', null).eq('is_company_admin', false)
    if (emps?.length) await a.from('notifications').insert(emps.map(e => ({ user_id: e.user_id, message: `Доступен новый тест «${b.title}» — откройте «Мои цели»`, link: `/test/${t.id}` })))
    return res.status(200).json(t)
  }

  if (action === 'update' && req.method === 'PUT') {
    if (!isAdmin) return res.status(403).json({ error: 'Недостаточно прав' })
    const { id, questions, ...fields } = req.body
    await a.from('tests').update(fields).eq('id', id).eq('company_id', companyId)
    await a.from('questions').delete().eq('test_id', id)
    await saveQuestions(a, id, questions || [])
    return res.status(200).json({ success: true })
  }

  if (action === 'delete' && req.method === 'DELETE') {
    if (!isAdmin) return res.status(403).json({ error: 'Недостаточно прав' })
    await a.from('tests').update({ is_active: false }).eq('id', req.body.id).eq('company_id', companyId)
    return res.status(200).json({ success: true })
  }

  if (action === 'start' && req.method === 'POST') {
    const id = req.body.id
    const { data: t } = await a.from('tests').select('*').eq('id', id).maybeSingle()
    if (!t) return res.status(404).json({ error: 'Тест не найден' })
    const { count } = await a.from('test_attempts').select('id', { count: 'exact', head: true }).eq('test_id', id).eq('user_id', ctx.user.id)
    if (t.attempts_allowed > 0 && (count || 0) >= t.attempts_allowed) return res.status(400).json({ error: 'Лимит попыток исчерпан' })
    const { data: att, error } = await a.from('test_attempts').insert({ user_id: ctx.user.id, test_id: id, started_at: new Date().toISOString() }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    const { data: qs } = await a.from('questions').select('*').eq('test_id', id).order('sort_order')
    const questions = []
    for (const q of qs || []) {
      const { data: opts } = await a.from('answer_options').select('id, text, sort_order').eq('question_id', q.id).order('sort_order')
      questions.push({ id: q.id, type: q.type, text: q.text, points: q.points, difficulty: q.difficulty, media_url: q.media_url, options: t.is_random ? shuffle(opts || []) : (opts || []) })
    }
    return res.status(200).json({ attempt: att, questions: t.is_random ? shuffle(questions) : questions, test: t })
  }

  if (action === 'submit' && req.method === 'POST') {
    const { attempt_id, answers, time_spent } = req.body
    const { data: att } = await a.from('test_attempts').select('*').eq('id', attempt_id).eq('user_id', ctx.user.id).maybeSingle()
    if (!att) return res.status(404).json({ error: 'Попытка не найдена' })
    const { data: t } = await a.from('tests').select('*').eq('id', att.test_id).maybeSingle()
    const { data: qs } = await a.from('questions').select('*').eq('test_id', att.test_id)
    const qmap = Object.fromEntries((qs || []).map(q => [String(q.id), q]))
    let earned = 0, total = 0
    const responses = []
    for (const qid of Object.keys(answers || {})) {
      const q = qmap[qid]; if (!q) continue
      const ans = answers[qid]
      total += q.points
      if (q.type === 'open') { responses.push({ attempt_id, question_id: +qid, text_response: ans.text || '', is_correct: null }); continue }
      const { data: opts } = await a.from('answer_options').select('*').eq('question_id', qid)
      const correctIds = (opts || []).filter(o => o.is_correct).map(o => o.id).sort()
      let isCorrect = false
      if (q.type === 'single' || q.type === 'multi') {
        const sel = (ans.option_ids || []).slice().sort()
        isCorrect = JSON.stringify(sel) === JSON.stringify(correctIds)
      } else if (q.type === 'fill') {
        isCorrect = String(ans.text || '').trim().toLowerCase() === String(q.correct_text || '').trim().toLowerCase()
      }
      if (isCorrect) earned += q.points
      responses.push({ attempt_id, question_id: +qid, selected_option_ids: ans.option_ids || null, text_response: ans.text || null, is_correct: isCorrect })
    }
    if (responses.length) await a.from('test_responses').insert(responses)
    const pct = total > 0 ? Math.round(earned / total * 100) : 0
    const passed = pct >= (t?.passing_score || 70)
    await a.from('test_attempts').update({ score: pct, total_points: total, is_passed: passed, time_spent: time_spent || 0, completed_at: new Date().toISOString() }).eq('id', attempt_id)
    if (passed && t) {
      if (t.karma_reward > 0) {
        const { data: bal } = await a.from('karma_balance').select('balance').eq('user_id', ctx.user.id).maybeSingle()
        await a.from('karma_balance').upsert({ user_id: ctx.user.id, balance: (bal?.balance || 0) + t.karma_reward }, { onConflict: 'user_id' })
        await a.from('karma_transactions').insert({ user_id: ctx.user.id, amount: t.karma_reward, type: 'test_reward', description: `Тест «${t.title}» сдан (${pct}%)` })
      }
      if (t.energy_reward > 0) {
        const { data: en } = await a.from('kpi_energy').select('energy').eq('user_id', ctx.user.id).maybeSingle()
        await a.from('kpi_energy').upsert({ user_id: ctx.user.id, energy: (en?.energy || 0) + t.energy_reward, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      }
    }
    return res.status(200).json({ score: pct, passed, show_correct: t?.show_correct_answers })
  }

  if (action === 'results' && req.method === 'GET') {
    // Раньше — без проверки прав: любой сотрудник мог по id теста увидеть
    // результаты И личные данные (имя, email) всех остальных, кто его
    // проходил.
    if (!isAdmin) return res.status(403).json({ error: 'Недостаточно прав' })
    const id = req.query.id
    const { data: atts } = await a.from('test_attempts').select('*, profiles(display_name, first_name, last_name, email)').eq('test_id', id).order('completed_at', { ascending: false })
    const { data: qs } = await a.from('questions').select('*').eq('test_id', id)
    const mistake = {}
    for (const q of qs || []) mistake[q.id] = { text: q.text, wrong: 0, total: 0 }
    for (const att of atts || []) {
      if (!att.completed_at) continue
      const { data: resp } = await a.from('test_responses').select('*').eq('attempt_id', att.id)
      for (const r of resp || []) {
        if (mistake[r.question_id]) { mistake[r.question_id].total++; if (r.is_correct === false) mistake[r.question_id].wrong++ }
      }
    }
    const mistakes = Object.values(mistake).filter(m => m.total > 0).sort((x, y) => (y.wrong / y.total) - (x.wrong / x.total)).slice(0, 5)
    const done = (atts || []).filter(x => x.completed_at)
    const avg = done.length ? Math.round(done.reduce((s, x) => s + (x.score || 0), 0) / done.length) : 0
    return res.status(200).json({ attempts: atts || [], avg, mistakes })
  }

  if (action === 'my' && req.method === 'GET') {
    const { data: tests } = await a.from('tests').select('*').eq('company_id', companyId).eq('is_active', true).order('created_at', { ascending: false })
    const out = []
    for (const t of tests || []) {
      const { data: atts } = await a.from('test_attempts').select('*').eq('test_id', t.id).eq('user_id', ctx.user.id).order('completed_at', { ascending: false })
      out.push({ ...t, attempts: atts || [], best: (atts || []).filter(x => x.completed_at).reduce((m, x) => Math.max(m, x.score || 0), 0), attempts_used: (atts || []).length })
    }
    return res.status(200).json(out)
  }

  res.status(404).json({ error: 'Unknown action' })
}
