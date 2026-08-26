import { createClient } from '@supabase/supabase-js'
import { requireAuth, hasPermission } from '../../../lib/auth'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const todayISO = () => new Date().toISOString().slice(0, 10)

async function progress(a, planId) {
  const { data } = await a.from('adaptation_plan_events').select('id, status, is_mandatory, rating, day_number').eq('plan_id', planId)
  const list = data || []
  const done = list.filter(e => e.status === 'done')
  const mand = list.filter(e => e.is_mandatory)
  const mandDone = mand.filter(e => e.status === 'done')
  const rated = list.filter(e => e.rating != null)
  const avg = rated.length ? rated.reduce((s, e) => s + e.rating, 0) / rated.length : 0
  return { total: list.length, done: done.length, mandatoryTotal: mand.length, mandatoryDone: mandDone.length, avgRating: Math.round(avg * 10) / 10, events: list }
}
async function log(a, body) { await a.from('adaptation_history').insert(body) }
async function notify(a, userId, message, link) { await a.from('notifications').insert({ user_id: userId, message, link }) }

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return
  const a = sb()
  const action = req.query.action
  const companyId = ctx.profile?.company_id
  const isManager = hasPermission(ctx.profile, 'can_manage_employees')

  // ===== ШАБЛОНЫ =====
  if (action === 'templates' && req.method === 'GET') {
    const kind = req.query.kind === 'development' ? 'development' : 'onboarding'
    const { data } = await a.from('adaptation_templates').select('*').eq('is_active', true).eq('kind', kind).order('id')
    return res.status(200).json(data || [])
  }

  // ===== СПИСОК ПЛАНОВ =====
  if (action === 'plans' && req.method === 'GET') {
    const kind = req.query.kind === 'development' ? 'development' : 'onboarding'
    let q = a.from('adaptation_plans').select('*').eq('company_id', companyId).eq('kind', kind).order('created_at', { ascending: false })
    if (!isManager) q = q.eq('employee_id', ctx.user.id)
    const { data } = await q
    const out = []
    for (const p of data || []) {
      const { data: emp } = await a.from('profiles').select('display_name, email, first_name, last_name').eq('user_id', p.employee_id).maybeSingle()
      const pr = await progress(a, p.id)
      out.push({ ...p, employee_name: emp ? ([emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.display_name || emp.email) : '—', progress: { total: pr.total, done: pr.done, mandatoryTotal: pr.mandatoryTotal, mandatoryDone: pr.mandatoryDone, avgRating: pr.avgRating } })
    }
    return res.status(200).json(out)
  }

  // ===== СОЗДАНИЕ ЧЕРНОВИКА =====
  if (action === 'plans' && req.method === 'POST') {
    if (!isManager) return res.status(403).json({ error: 'Недостаточно прав' })
    const { employeeId, templateId, startDate, kind } = req.body
    const planKind = kind === 'development' ? 'development' : 'onboarding'
    if (!employeeId || !templateId || !startDate) return res.status(400).json({ error: 'Нет данных' })
    const { data: tpl } = await a.from('adaptation_templates').select('*').eq('id', templateId).maybeSingle()
    if (!tpl) return res.status(404).json({ error: 'Шаблон не найден' })
    const { data: plan, error } = await a.from('adaptation_plans').insert({ company_id: companyId, employee_id: employeeId, manager_id: ctx.user.id, template_id: templateId, kind: planKind, start_date: startDate, end_date: addDays(startDate, 27), status: 'draft' }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    const rows = []
    ;(tpl.days || []).forEach(d => (d.events || []).forEach(ev => rows.push({
      plan_id: plan.id, day_number: d.day_number, event_time: ev.time || null, title: ev.title, description: ev.description || null,
      event_type: ev.type || 'control', required_action: ev.required_action || null, expected_result: ev.expected_result || null,
      duration_minutes: ev.duration_minutes || null, materials: ev.materials || null, is_mandatory: ev.is_mandatory !== false
    })))
    if (rows.length) await a.from('adaptation_plan_events').insert(rows)
    return res.status(200).json(plan)
  }

  // ===== ПРАВКА ЧЕРНОВИКА =====
  if (action === 'plan-update' && req.method === 'POST') {
    if (!isManager) return res.status(403).json({ error: 'Недостаточно прав' })
    const { planId, updates = [], adds = [], deletes = [] } = req.body
    const { data: plan } = await a.from('adaptation_plans').select('*').eq('id', planId).maybeSingle()
    if (!plan || plan.company_id !== companyId) return res.status(404).json({ error: 'План не найден' })
    if (plan.status !== 'draft') return res.status(400).json({ error: 'План уже активирован — правки запрещены' })
    for (const u of updates) { const { id, ...fields } = u; await a.from('adaptation_plan_events').update(fields).eq('id', id).eq('plan_id', planId) }
    if (adds.length) await a.from('adaptation_plan_events').insert(adds.map(x => ({ ...x, plan_id: planId, is_custom: true })))
    if (deletes.length) await a.from('adaptation_plan_events').delete().in('id', deletes).eq('plan_id', planId)
    return res.status(200).json({ success: true })
  }

  // ===== АКТИВАЦИЯ =====
  if (action === 'activate' && req.method === 'POST') {
    if (!isManager) return res.status(403).json({ error: 'Недостаточно прав' })
    const { planId } = req.body
    const { data: plan } = await a.from('adaptation_plans').select('*').eq('id', planId).maybeSingle()
    if (!plan || plan.company_id !== companyId) return res.status(404).json({ error: 'План не найден' })
    if (plan.status !== 'draft') return res.status(400).json({ error: 'Нельзя активировать' })
    await a.from('adaptation_plans').update({ status: 'active' }).eq('id', planId)
    await log(a, { plan_id: planId, employee_id: plan.employee_id, manager_id: ctx.user.id, type: 'plan_meeting', description: 'План адаптации создан и активирован', author_role: 'system' })
    await notify(a, plan.employee_id, 'Ваш план адаптации активирован. Откройте раздел «Адаптация».', '/onboarding')
    return res.status(200).json({ success: true })
  }

  // ===== МОЙ ПЛАН (сотрудник) =====
  if (action === 'my' && req.method === 'GET') {
    const kind = req.query.kind === 'development' ? 'development' : 'onboarding'
    const { data: plan } = await a.from('adaptation_plans').select('*').eq('employee_id', ctx.user.id).eq('company_id', companyId).eq('kind', kind).in('status', ['active', 'draft']).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!plan) return res.status(200).json(null)
    const { data: events } = await a.from('adaptation_plan_events').select('*').eq('plan_id', plan.id).order('day_number').order('event_time')
    const enriched = (events || []).map(e => ({ ...e, event_date: addDays(plan.start_date, e.day_number - 1) }))
    const today = todayISO()
    const current = enriched.find(e => e.status === 'pending' && e.event_date <= today) || null
    const pr = await progress(a, plan.id)
    return res.status(200).json({ plan, events: enriched, progress: { total: pr.total, done: pr.done, mandatoryTotal: pr.mandatoryTotal, mandatoryDone: pr.mandatoryDone, avgRating: pr.avgRating }, currentEvent: current })
  }

  // ===== СОТРУДНИК: ВЫПОЛНИТЬ СОБЫТИЕ =====
  if (action === 'complete' && req.method === 'POST') {
    const { eventId, feedback } = req.body
    const { data: ev } = await a.from('adaptation_plan_events').select('*, adaptation_plans(employee_id, manager_id)').eq('id', eventId).maybeSingle()
    if (!ev || ev.adaptation_plans?.employee_id !== ctx.user.id) return res.status(403).json({ error: 'Не ваше событие' })
    await a.from('adaptation_plan_events').update({ status: 'done', employee_confirmed_at: new Date().toISOString(), employee_feedback: feedback || null }).eq('id', eventId)
    await log(a, { plan_id: ev.plan_id, event_id: eventId, employee_id: ctx.user.id, type: 'control', description: `Событие «${ev.title}» выполнено.${feedback ? ' Фидбек: ' + feedback : ''}`, author_role: 'employee' })
    if (ev.adaptation_plans?.manager_id) await notify(a, ev.adaptation_plans.manager_id, `Сотрудник выполнил событие «${ev.title}». Поставьте оценку.`, '/company-admin/adaptation')
    return res.status(200).json({ success: true })
  }

  // ===== РОП: УТВЕРДИТЬ СОБЫТИЕ С ОЦЕНКОЙ =====
  if (action === 'approve' && req.method === 'POST') {
    if (!isManager) return res.status(403).json({ error: 'Недостаточно прав' })
    const { eventId, rating, feedback } = req.body
    const { data: ev } = await a.from('adaptation_plan_events').select('*, adaptation_plans(employee_id, company_id)').eq('id', eventId).maybeSingle()
    if (!ev || ev.adaptation_plans?.company_id !== companyId) return res.status(404).json({ error: 'Событие не найдено' })
    await a.from('adaptation_plan_events').update({ manager_confirmed_at: new Date().toISOString(), manager_feedback: feedback || null, rating: rating || null }).eq('id', eventId)
    await log(a, { plan_id: ev.plan_id, event_id: eventId, manager_id: ctx.user.id, type: 'feedback', description: `Обратная связь по «${ev.title}».${feedback ? ' ' + feedback : ''}`, author_role: 'manager', rating: rating || null })
    await notify(a, ev.adaptation_plans.employee_id, `РОП оставил обратную связь по «${ev.title}» (оценка ${rating || '—'}).`, '/onboarding')
    return res.status(200).json({ success: true })
  }

  // ===== КОРРЕКТИРОВКА =====
  if (action === 'correction' && req.method === 'POST') {
    if (!isManager) return res.status(403).json({ error: 'Недостаточно прав' })
    const { planId, eventId, description, dayNumber, title } = req.body
    const { data: plan } = await a.from('adaptation_plans').select('employee_id, company_id').eq('id', planId).maybeSingle()
    if (!plan || plan.company_id !== companyId) return res.status(404).json({ error: 'План не найден' })
    const { data: hist } = await a.from('adaptation_history').insert({ plan_id: planId, event_id: eventId || null, manager_id: ctx.user.id, type: 'correction', description: description || 'Корректировка', author_role: 'manager' }).select().single()
    if (title) await a.from('adaptation_plan_events').insert({ plan_id: planId, day_number: dayNumber || 1, title, description, event_type: 'rework', is_mandatory: true })
    await notify(a, plan.employee_id, 'РОП добавил корректировку в ваш план адаптации.', '/onboarding')
    return res.status(200).json({ success: true })
  }

  // ===== СОТРУДНИК: ОЦЕНИТЬ ПОЛУЧЕННУЮ ОБРАТНУЮ СВЯЗЬ =====
  // Отдельно от adaptation_plan_events.rating (это оценка руководителем
  // сотрудника) — здесь сотрудник оценивает качество/полезность самой
  // обратной связи, которую ему оставили (запись журнала типа 'feedback').
  if (action === 'rate-feedback' && req.method === 'POST') {
    const { historyId, employeeRating } = req.body
    if (!historyId || !employeeRating) return res.status(400).json({ error: 'Нет данных' })
    const { data: entry } = await a.from('adaptation_history').select('*, adaptation_plans(employee_id, manager_id)').eq('id', historyId).maybeSingle()
    if (!entry || entry.adaptation_plans?.employee_id !== ctx.user.id) return res.status(403).json({ error: 'Не ваша запись' })
    if (entry.type !== 'feedback') return res.status(400).json({ error: 'Оценить можно только запись обратной связи' })
    await a.from('adaptation_history').update({ employee_rating: employeeRating }).eq('id', historyId)
    if (entry.manager_id) await notify(a, entry.manager_id, `Сотрудник оценил вашу обратную связь: ${employeeRating}/5.`, '/company-admin/adaptation')
    return res.status(200).json({ success: true })
  }

  // ===== ИСТОРИЯ =====
  if (action === 'history' && req.method === 'GET') {
    const { planId, type, from, to } = req.query
    const { data: plan } = await a.from('adaptation_plans').select('employee_id, company_id').eq('id', planId).maybeSingle()
    if (!plan || plan.company_id !== companyId) return res.status(404).json({ error: 'План не найден' })
    if (!isManager && plan.employee_id !== ctx.user.id) return res.status(403).json({ error: 'Недостаточно прав' })
    let q = a.from('adaptation_history').select('*').eq('plan_id', planId).order('created_at', { ascending: false })
    if (type) q = q.eq('type', type)
    if (from) q = q.gte('created_at', from)
    if (to) q = q.lte('created_at', to + 'T23:59:59')
    const { data } = await q
    return res.status(200).json(data || [])
  }

  // ===== ОТЧЁТ О ПЕРСПЕКТИВНОСТИ =====
  if (action === 'report' && req.method === 'GET') {
    if (!isManager) return res.status(403).json({ error: 'Недостаточно прав' })
    const { planId } = req.query
    const { data: plan } = await a.from('adaptation_plans').select('company_id').eq('id', planId).maybeSingle()
    if (!plan || plan.company_id !== companyId) return res.status(404).json({ error: 'План не найден' })
    const pr = await progress(a, planId)
    const { data: corr } = await a.from('adaptation_history').select('id').eq('plan_id', planId).eq('type', 'correction')
    const corrections = (corr || []).length
    const pct = pr.mandatoryTotal ? Math.round((pr.mandatoryDone / pr.mandatoryTotal) * 100) : 0
    const first = pr.events.filter(e => e.rating != null && e.day_number <= 7)
    const last = pr.events.filter(e => e.rating != null && e.day_number >= 15)
    const avgOf = arr => arr.length ? arr.reduce((s, e) => s + e.rating, 0) / arr.length : null
    const firstAvg = avgOf(first), lastAvg = avgOf(last)
    const dynamics = firstAvg != null && lastAvg != null ? lastAvg - firstAvg : 0
    let recommendation, color
    if (pct >= 90 && pr.avgRating >= 4.5 && dynamics >= 0) { recommendation = 'Рекомендован к дальнейшей работе'; color = '#4ade80' }
    else if (pct >= 70 && pr.avgRating >= 3.5) { recommendation = 'Требует доработки'; color = '#FFD700' }
    else { recommendation = 'Не рекомендован'; color = '#f87171' }
    return res.status(200).json({ ...pr, pct, corrections, dynamics: Math.round(dynamics * 10) / 10, recommendation, color })
  }

  res.status(404).json({ error: 'Unknown action' })
}
