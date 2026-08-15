import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import PremiumModal from '../../components/PremiumModal'
import { withAuth } from '../../components/withAuth'

const CATEGORY_LABELS = { strategic: 'Стратегическая', tactical: 'Тактическая', operational: 'Операционная' }
const KIND_LABELS = { individual: 'Индивидуальная', group: 'Групповая', company: 'Вся компания' }
const STATUS_LABELS = { draft: 'Черновик', active: 'Активна', paused: 'Пауза', completed: 'Завершена', failed: 'Не достигнута' }

function GoalsAdmin() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState(null)
  const [goals, setGoals] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', goal_kind: 'individual', category: 'tactical', start_date: '', end_date: '', priority: 3 })
  const [indicatorForm, setIndicatorForm] = useState({ name: '', unit: '', target_min: '', target_max: '', weight: 1 })
  const [assigneeId, setAssigneeId] = useState('')
  const [notification, setNotification] = useState({ show: false, message: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profileData } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (!profileData) { router.push('/'); return }
      setCompanyId(profileData.company_id)
      await Promise.all([loadGoals(profileData.company_id), loadEmployees(profileData.company_id)])
      setLoading(false)
    }
    init()
  }, [router])

  const loadGoals = async (compId) => {
    const { data } = await supabase.from('goals')
      .select('*, goal_indicators(*), goal_assignments(user_id)')
      .eq('company_id', compId).order('created_at', { ascending: false })
    setGoals(data || [])
  }
  const loadEmployees = async (compId) => {
    const { data } = await supabase.from('profiles')
      .select('user_id, display_name, email').eq('company_id', compId).is('deleted_at', null)
    setEmployees(data || [])
  }
  const notify = (message) => { setNotification({ show: true, message }); setTimeout(() => setNotification({ show: false, message: '' }), 3000) }

  const createGoal = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return notify('Введите название цели')
    const { data: goal, error } = await supabase.from('goals').insert({
      company_id: companyId, title: form.title, description: form.description,
      goal_kind: form.goal_kind, category: form.category,
      start_date: form.start_date || null, end_date: form.end_date || null,
      priority: parseInt(form.priority) || 3, status: 'draft', progress: 0, created_by: null
    }).select().single()
    if (error) return notify('Ошибка создания цели')
    setShowForm(false)
    setForm({ title: '', description: '', goal_kind: 'individual', category: 'tactical', start_date: '', end_date: '', priority: 3 })
    await loadGoals(companyId)
    setExpanded(goal.id)
    notify('Цель создана. Добавьте индикаторы и назначьте сотрудников.')
  }

  const addIndicator = async (goalId) => {
    if (!indicatorForm.name.trim()) return notify('Введите название индикатора')
    const { error } = await supabase.from('goal_indicators').insert({
      goal_id: goalId, name: indicatorForm.name, unit: indicatorForm.unit || null,
      target_min: indicatorForm.target_min ? parseFloat(indicatorForm.target_min) : null,
      target_max: indicatorForm.target_max ? parseFloat(indicatorForm.target_max) : null,
      weight: parseFloat(indicatorForm.weight) || 1, data_source: 'manual'
    })
    if (error) return notify('Ошибка добавления индикатора')
    setIndicatorForm({ name: '', unit: '', target_min: '', target_max: '', weight: 1 })
    await loadGoals(companyId)
  }

  const assignEmployee = async (goalId) => {
    if (!assigneeId) return notify('Выберите сотрудника')
    const { error } = await supabase.from('goal_assignments').insert({ goal_id: goalId, user_id: assigneeId })
    if (error) return notify('Ошибка назначения')
    setAssigneeId('')
    await loadGoals(companyId)
  }

  const setStatus = async (goalId, status) => {
    await supabase.from('goals').update({ status }).eq('id', goalId)
    await loadGoals(companyId)
    notify(status === 'active' ? 'Цель активирована' : 'Статус обновлён')
  }

  if (loading) return <div className="flex justify-center items-center py-24"><Spinner size={52} /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/company-admin" className="group flex items-center text-gray-400 hover:text-white transition-colors">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="transition-transform group-hover:-translate-x-1">
            <circle cx="14" cy="14" r="13" stroke="rgba(249,115,22,.4)" strokeWidth="0.8" />
            <path d="M17 8l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#d4af37' }}>Управление целями</h1>
        <button onClick={() => setShowForm(true)} className="btn-glass text-sm px-4 py-2 ml-auto">Создать цель</button>
      </div>

      {goals.length === 0 && <div className="premium-card"><p className="text-gray-400">Целей пока нет. Создайте первую цель.</p></div>}

      <div className="space-y-4">
        {goals.map(goal => (
          <div key={goal.id} className="premium-card">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold">{goal.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{goal.description}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-blue-900 text-blue-300">{KIND_LABELS[goal.goal_kind]}</span>
                  <span className="px-2 py-0.5 rounded bg-purple-900 text-purple-300">{CATEGORY_LABELS[goal.category]}</span>
                  <span className={`px-2 py-0.5 rounded ${goal.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'}`}>{STATUS_LABELS[goal.status]}</span>
                  <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400">Приоритет: {goal.priority}</span>
                </div>
              </div>
              <button onClick={() => setExpanded(expanded === goal.id ? null : goal.id)} className="btn-outline text-xs px-3 py-1.5 ml-4 flex-shrink-0">
                {expanded === goal.id ? 'Свернуть' : 'Настроить'}
              </button>
            </div>

            {expanded === goal.id && (
              <div className="mt-6 pt-6 border-t border-gray-700 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Индикаторы */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">Индикаторы</h4>
                  {(goal.goal_indicators || []).length === 0 && <p className="text-xs text-gray-500 mb-3">Индикаторов пока нет</p>}
                  {(goal.goal_indicators || []).map(ind => (
                    <div key={ind.id} className="flex justify-between items-center p-2 mb-2 rounded bg-gray-800 text-sm">
                      <span className="text-white">{ind.name} {ind.unit && <span className="text-gray-500">({ind.unit})</span>}</span>
                      <span className="text-gray-400">план: {ind.target_max ?? ind.target_min ?? '—'}</span>
                    </div>
                  ))}
                  <div className="space-y-2 mt-3">
                    <input className="input-field" placeholder="Название (Выручка, Конверсия)" value={indicatorForm.name} onChange={e => setIndicatorForm({ ...indicatorForm, name: e.target.value })} />
                    <div className="flex gap-2">
                      <input className="input-field" placeholder="Ед." value={indicatorForm.unit} onChange={e => setIndicatorForm({ ...indicatorForm, unit: e.target.value })} />
                      <input className="input-field" type="number" placeholder="План" value={indicatorForm.target_max} onChange={e => setIndicatorForm({ ...indicatorForm, target_max: e.target.value })} />
                    </div>
                    <button onClick={() => addIndicator(goal.id)} className="btn-glass text-xs px-3 py-1.5 w-full">Добавить индикатор</button>
                  </div>
                </div>
                {/* Назначение */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">Назначено</h4>
                  {(goal.goal_assignments || []).length === 0 && <p className="text-xs text-gray-500 mb-3">Никого не назначено</p>}
                  {(goal.goal_assignments || []).map(ga => {
                    const emp = employees.find(e => e.user_id === ga.user_id)
                    return <div key={ga.user_id} className="p-2 mb-2 rounded bg-gray-800 text-sm text-white">{emp?.display_name || emp?.email || ga.user_id}</div>
                  })}
                  {goal.goal_kind !== 'company' && (
                    <div className="space-y-2 mt-3">
                      <select className="input-field" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                        <option value="">Выберите сотрудника</option>
                        {employees.map(emp => <option key={emp.user_id} value={emp.user_id}>{emp.display_name || emp.email}</option>)}
                      </select>
                      <button onClick={() => assignEmployee(goal.id)} className="btn-glass text-xs px-3 py-1.5 w-full">Назначить</button>
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    {goal.status !== 'active' && <button onClick={() => setStatus(goal.id, 'active')} className="btn-glass btn-glass-green text-xs px-3 py-1.5 flex-1">Активировать</button>}
                    {goal.status === 'active' && <button onClick={() => setStatus(goal.id, 'completed')} className="btn-glass text-xs px-3 py-1.5 flex-1">Завершить</button>}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Модалка создания цели */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, textAlign: 'left' }}>
            <h3 className="text-xl font-bold text-white mb-4">Новая цель</h3>
            <form onSubmit={createGoal} className="space-y-3">
              <input className="input-field" placeholder="Название (Продать на 1 млн)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              <textarea className="input-field" rows={2} placeholder="Описание" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <div className="flex gap-2">
                <select className="input-field" value={form.goal_kind} onChange={e => setForm({ ...form, goal_kind: e.target.value })}>
                  <option value="individual">Индивидуальная</option><option value="group">Групповая</option><option value="company">Вся компания</option>
                </select>
                <select className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="strategic">Стратегическая</option><option value="tactical">Тактическая</option><option value="operational">Операционная</option>
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-xs text-gray-400">Начало</label><input type="date" className="input-field" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                <div className="flex-1"><label className="text-xs text-gray-400">Окончание</label><input type="date" className="input-field" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
                <div className="flex-1"><label className="text-xs text-gray-400">Приоритет 1–5</label><input type="number" min="1" max="5" className="input-field" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline flex-1">Отмена</button>
                <button type="submit" className="btn-glass btn-glass-green flex-1">Создать</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notification.show && (
        <div className="fixed top-4 right-4 z-[1100] px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(10,10,15,0.9)', border: '1px solid rgba(255,215,0,0.4)', color: '#FFD700' }}>
          {notification.message}
        </div>
      )}
    </div>
  )
}
export default withAuth(GoalsAdmin, { permission: 'can_create_tasks' })
