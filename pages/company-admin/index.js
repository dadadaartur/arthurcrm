import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import { withAuth } from '../../components/withAuth'

function CompanyAdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    tasks: 0, pendingReview: 0, employees: 0, goals: 0,
    pendingPurchases: 0, rewards: 0, onboardingPlans: 0
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, role_id')
        .eq('user_id', user.id)
        .single()
      if (!profile) { router.push('/'); return }
      await loadStats(profile.company_id)
      setLoading(false)
    }
    init()
  }, [])

  const loadStats = async (compId) => {
    // Прямые сущности компании
    const [tasksRes, employeesRes, goalsRes, rewardsRes, onboardingRes] = await Promise.all([
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('company_id', compId).eq('is_active', true),
      supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('company_id', compId).is('deleted_at', null).eq('is_company_admin', false),
      supabase.from('goals').select('id', { count: 'exact', head: true }).eq('company_id', compId).or('is_active.eq.true,status.eq.active'),
      supabase.from('rewards').select('id', { count: 'exact', head: true }).eq('company_id', compId),
      supabase.from('onboarding_plans').select('id', { count: 'exact', head: true }).eq('company_id', compId).eq('is_active', true)
    ])

    // Задания на проверке — через id задач компании
    let pendingReview = 0
    const { data: companyTasks } = await supabase.from('tasks').select('id').eq('company_id', compId)
    const taskIds = (companyTasks || []).map(t => t.id)
    if (taskIds.length > 0) {
      const { count } = await supabase.from('task_assignments')
        .select('id', { count: 'exact', head: true })
        .in('task_id', taskIds)
        .eq('status', 'pending_review')
      pendingReview = count || 0
    }

    // Сертификаты на подтверждении — через user_id сотрудников компании
    let pendingPurchases = 0
    const { data: employees } = await supabase.from('profiles').select('user_id').eq('company_id', compId).is('deleted_at', null)
    const userIds = (employees || []).map(e => e.user_id)
    if (userIds.length > 0) {
      const { count } = await supabase.from('purchases')
        .select('id', { count: 'exact', head: true })
        .in('user_id', userIds)
        .eq('status', 'pending')
      pendingPurchases = count || 0
    }

    setStats({
      tasks: tasksRes.count || 0,
      employees: employeesRes.count || 0,
      goals: goalsRes.count || 0,
      rewards: rewardsRes.count || 0,
      onboardingPlans: onboardingRes.count || 0,
      pendingReview,
      pendingPurchases
    })
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spinner /></div>

  // Каждая карточка = дашборд: цифра + подпись, клик ведёт туда, откуда берётся цифра
  const cards = [
    { value: stats.tasks, label: 'активных заданий', path: '/company-admin/tasks', accent: '#FFD700' },
    { value: stats.pendingReview, label: 'заданий на проверке', path: '/company-admin/review', accent: '#c084fc' },
    { value: stats.employees, label: 'сотрудников', path: '/company-admin/employees', accent: '#4ade80' },
    { value: stats.goals, label: 'активных целей', path: '/company-admin/goals', accent: '#a0e9ff' },
    { value: stats.pendingPurchases, label: 'сертификатов на подтверждении', path: '/company-admin/purchases', accent: '#ffb3c6' },
    { value: stats.rewards, label: 'товаров в магазине', path: '/company-admin/rewards', accent: '#f97316' },
    { value: stats.onboardingPlans, label: 'планов адаптации', path: '/company-admin/onboarding', accent: '#FFD700' },
  ]

  return (
    <div style={{ minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 20px', position: 'relative' }}>
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: 28, fontWeight: 600, marginBottom: 8,
          background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>Панель управления</h1>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 32 }}>
          Нажмите на любую карточку, чтобы перейти в раздел, откуда берётся цифра
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {cards.map(card => (
            <div
              key={card.path}
              onClick={() => router.push(card.path)}
              style={{
                background: 'rgba(15,20,35,0.8)', backdropFilter: 'blur(10px)',
                borderRadius: 16, padding: 24, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)',
                transition: 'transform 0.25s, border-color 0.25s, box-shadow 0.25s',
                textAlign: 'center'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.borderColor = card.accent
                e.currentTarget.style.boxShadow = `0 8px 24px ${card.accent}33`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ fontSize: 40, fontWeight: 700, color: card.accent, lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: 14, color: '#aaa', marginTop: 8 }}>{card.label}</div>
              <div style={{ fontSize: 12, color: card.accent, marginTop: 12, opacity: 0.7 }}>открыть раздел →</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default withAuth(CompanyAdminDashboard, { anyStaff: true })
