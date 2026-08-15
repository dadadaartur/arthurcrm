import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'

export default function MyOnboarding() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [onboarding, setOnboarding] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: ob } = await supabase.from('employee_onboarding')
        .select('*, onboarding_plans(name, onboarding_steps(*, onboarding_step_tasks(task_id, tasks(title))))')
        .eq('employee_id', user.id).in('status', ['in_progress', 'completed'])
        .order('started_at', { ascending: false }).limit(1).maybeSingle()
      setOnboarding(ob)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <div className="flex justify-center items-center py-24"><Spinner size={52} /></div>

  const plan = onboarding?.onboarding_plans
  const steps = plan ? (plan.onboarding_steps || []).slice().sort((a, b) => a.sort_order - b.sort_order) : []

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="group flex items-center text-gray-400 hover:text-white transition-colors">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="transition-transform group-hover:-translate-x-1">
            <circle cx="14" cy="14" r="13" stroke="rgba(249,115,22,.4)" strokeWidth="0.8" />
            <path d="M17 8l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#d4af37' }}>Моя адаптация</h1>
      </div>

      {!onboarding && <div className="premium-card"><p className="text-gray-400">План адаптации вам пока не назначен.</p></div>}

      {onboarding && (
        <>
          <div className="premium-card mb-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">План адаптации</p>
                <p className="text-xl font-bold text-white">{plan?.name}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs ${onboarding.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-blue-900 text-blue-300'}`}>
                {onboarding.status === 'completed' ? 'Завершена' : 'В процессе'}
              </span>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Прогресс</span><span>{onboarding.progress || 0}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: (onboarding.progress || 0) + '%', background: 'linear-gradient(90deg, #FFD700, #FFA500)' }} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {steps.map((step, idx) => {
              const isCurrent = idx === onboarding.current_step && onboarding.status === 'in_progress'
              const isDone = idx < onboarding.current_step || onboarding.status === 'completed'
              return (
                <div key={step.id} className="premium-card" style={{ borderColor: isCurrent ? 'rgba(255,215,0,0.6)' : undefined }}>
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isDone ? 'bg-green-700 text-white' : isCurrent ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold">{step.title}</h3>
                      {(step.onboarding_step_tasks || []).map(st => (
                        <p key={st.task_id} className="text-sm text-gray-400">• {st.tasks?.title || 'Задание'}</p>
                      ))}
                    </div>
                    {isCurrent && <span className="text-xs text-yellow-400 flex-shrink-0">Текущий шаг</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
