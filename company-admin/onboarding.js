import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import { withAuth } from '../../components/withAuth'

function OnboardingAdmin() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState(null)
  const [plans, setPlans] = useState([])
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [planName, setPlanName] = useState('')
  const [expandedPlan, setExpandedPlan] = useState(null)
  const [stepForm, setStepForm] = useState({ title: '', description: '' })
  const [stepTaskId, setStepTaskId] = useState({})
  const [assignPlanId, setAssignPlanId] = useState('')
  const [assignEmployeeId, setAssignEmployeeId] = useState('')
  const [notification, setNotification] = useState({ show: false, message: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profileData } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (!profileData) { router.push('/'); return }
      setCompanyId(profileData.company_id)
      await Promise.all([loadPlans(profileData.company_id), loadTasks(profileData.company_id), loadEmployees(profileData.company_id)])
      setLoading(false)
    }
    init()
  }, [router])

  const loadPlans = async (compId) => {
    const { data } = await supabase.from('onboarding_plans')
      .select('*, onboarding_steps(*, onboarding_step_tasks(task_id))')
      .eq('company_id', compId).order('created_at', { ascending: false })
    setPlans(data || [])
  }
  const loadTasks = async (compId) => {
    const { data } = await supabase.from('tasks').select('id, title').eq('company_id', compId).eq('is_active', true)
    setTasks(data || [])
  }
  const loadEmployees = async (compId) => {
    const { data } = await supabase.from('profiles').select('user_id, display_name, email').eq('company_id', compId).is('deleted_at', null)
    setEmployees(data || [])
  }
  const notify = (message) => { setNotification({ show: true, message }); setTimeout(() => setNotification({ show: false, message: '' }), 3000) }

  const createPlan = async () => {
    if (!planName.trim()) return notify('Введите название плана')
    const { error } = await supabase.from('onboarding_plans').insert({ company_id: companyId, name: planName, is_active: true })
    if (error) return notify('Ошибка создания плана')
    setPlanName('')
    await loadPlans(companyId)
  }

  const addStep = async (planId) => {
    if (!stepForm.title.trim()) return notify('Введите название шага')
    const { data: existing } = await supabase.from('onboarding_steps').select('sort_order').eq('plan_id', planId)
    const nextOrder = (existing || []).length
    const { error } = await supabase.from('onboarding_steps').insert({ plan_id: planId, title: stepForm.title, description: stepForm.description, sort_order: nextOrder, required_for_completion: true })
    if (error) return notify('Ошибка добавления шага')
    setStepForm({ title: '', description: '' })
    await loadPlans(companyId)
  }

  const addStepTask = async (stepId) => {
    const taskId = stepTaskId[stepId]
    if (!taskId) return notify('Выберите задание')
    const { error } = await supabase.from('onboarding_step_tasks').insert({ step_id: stepId, task_id: taskId })
    if (error) return notify('Ошибка привязки задания')
    setStepTaskId({ ...stepTaskId, [stepId]: '' })
    await loadPlans(companyId)
  }

  const assignPlan = async () => {
    if (!assignPlanId || !assignEmployeeId) return notify('Выберите план и сотрудника')
    const plan = plans.find(p => p.id === parseInt(assignPlanId))
    if (!plan) return notify('План не найден')
    const sortedSteps = (plan.onboarding_steps || []).slice().sort((a, b) => a.sort_order - b.sort_order)
    const { error } = await supabase.from('employee_onboarding').insert({ employee_id: assignEmployeeId, plan_id: plan.id, current_step: 0, status: 'in_progress', progress: 0 })
    if (error) return notify('Ошибка назначения плана')
    // Назначаем задания первого шага
    if (sortedSteps.length > 0) {
      const firstStepTasks = (sortedSteps[0].onboarding_step_tasks || []).map(st => ({ task_id: st.task_id, user_id: assignEmployeeId, status: 'assigned' }))
      if (firstStepTasks.length > 0) await supabase.from('task_assignments').insert(firstStepTasks)
    }
    setAssignPlanId(''); setAssignEmployeeId('')
    notify('План адаптации назначен. Задания первого шага выданы сотруднику.')
  }

  if (loading) return <LoadingScreen size={52} />

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <BackArrow href="/company-admin" title="Планы адаптации" />

      {/* Создание плана */}
      <div className="premium-card mb-6">
        <h3 className="text-white font-semibold mb-3">Новый план адаптации</h3>
        <div className="flex gap-2">
          <input className="input-field" placeholder="Название (Адаптация МОП)" value={planName} onChange={e => setPlanName(e.target.value)} />
          <button onClick={createPlan} className="btn-glass flex-shrink-0">Создать</button>
        </div>
      </div>

      {/* Назначение плана сотруднику */}
      <div className="premium-card mb-6">
        <h3 className="text-white font-semibold mb-3">Назначить план сотруднику</h3>
        <div className="flex gap-2 flex-wrap">
          <select className="input-field flex-1 min-w-40" value={assignPlanId} onChange={e => setAssignPlanId(e.target.value)}>
            <option value="">Выберите план</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="input-field flex-1 min-w-40" value={assignEmployeeId} onChange={e => setAssignEmployeeId(e.target.value)}>
            <option value="">Выберите сотрудника</option>
            {employees.map(emp => <option key={emp.user_id} value={emp.user_id}>{emp.display_name || emp.email}</option>)}
          </select>
          <button onClick={assignPlan} className="btn-glass btn-glass-green flex-shrink-0">Назначить</button>
        </div>
      </div>

      {/* Список планов */}
      {plans.length === 0 && <div className="premium-card"><p className="text-gray-400">Планов пока нет.</p></div>}
      <div className="space-y-4">
        {plans.map(plan => (
          <div key={plan.id} className="premium-card">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-semibold">{plan.name}</h3>
              <button onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)} className="btn-outline text-xs px-3 py-1.5">
                {expandedPlan === plan.id ? 'Свернуть' : 'Настроить шаги'}
              </button>
            </div>
            {expandedPlan === plan.id && (
              <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
                {(plan.onboarding_steps || []).slice().sort((a, b) => a.sort_order - b.sort_order).map(step => (
                  <div key={step.id} className="p-3 rounded bg-gray-800">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">Шаг {step.sort_order + 1}: {step.title}</span>
                    </div>
                    {(step.onboarding_step_tasks || []).map(st => {
                      const t = tasks.find(x => x.id === st.task_id)
                      return <div key={st.task_id} className="text-sm text-gray-400 mt-1">• {t?.title || 'Задание удалено'}</div>
                    })}
                    <div className="flex gap-2 mt-2">
                      <select className="input-field flex-1" value={stepTaskId[step.id] || ''} onChange={e => setStepTaskId({ ...stepTaskId, [step.id]: e.target.value })}>
                        <option value="">Привязать задание</option>
                        {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </select>
                      <button onClick={() => addStepTask(step.id)} className="btn-glass text-xs flex-shrink-0">Добавить</button>
                    </div>
                  </div>
                ))}
                <div className="space-y-2">
                  <input className="input-field" placeholder="Название нового шага" value={stepForm.title} onChange={e => setStepForm({ ...stepForm, title: e.target.value })} />
                  <button onClick={() => addStep(plan.id)} className="btn-glass text-xs px-3 py-1.5">Добавить шаг</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {notification.show && (
        <div className="fixed top-4 right-4 z-[1100] px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(10,10,15,0.9)', border: '1px solid rgba(255,215,0,0.4)', color: '#FFD700' }}>
          {notification.message}
        </div>
      )}
    </div>
  )
}
export default withAuth(OnboardingAdmin, { permission: 'can_manage_employees' })
