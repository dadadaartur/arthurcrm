import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import { withAuth } from '../../components/withAuth'

function CompanyAdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ tasks: 0, employees: 0, rewards: 0, pendingReviews: 0, pendingPurchases: 0 })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (!profile) { router.push('/'); return }
      const compId = profile.company_id
      const [tasksRes, employeesRes, rewardsRes] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('company_id', compId).eq('is_active', true),
        supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('company_id', compId).is('deleted_at', null).eq('is_company_admin', false),
        supabase.from('rewards').select('id', { count: 'exact', head: true }).eq('company_id', compId)
      ])
      const { data: tasks } = await supabase.from('tasks').select('id').eq('company_id', compId)
      const ids = (tasks || []).map(t => t.id)
      let pr = 0
      if (ids.length) { const { count } = await supabase.from('task_assignments').select('id', { count: 'exact', head: true }).in('task_id', ids).eq('status', 'pending_review'); pr = count || 0 }
      const { data: emps } = await supabase.from('profiles').select('user_id').eq('company_id', compId).is('deleted_at', null)
      const uids = (emps || []).map(e => e.user_id)
      let pp = 0
      if (uids.length) { const { count } = await supabase.from('purchases').select('id', { count: 'exact', head: true }).in('user_id', uids).in('status', ['pending', 'new']); pp = count || 0 }
      setStats({ tasks: tasksRes.count || 0, employees: employeesRes.count || 0, rewards: rewardsRes.count || 0, pendingReviews: pr, pendingPurchases: pp })
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  const cards = [
    { title: 'Команда', value: stats.employees, sub: 'сотрудников', href: '/company-admin/employees', color: '#a0e9ff' },
    { title: 'Задания', value: stats.tasks, sub: 'активных', href: '/company-admin/tasks', color: '#FFD700' },
    { title: 'Проверки', value: stats.pendingReviews, sub: 'ждут решения', href: '/company-admin/review', color: '#f97316', alert: stats.pendingReviews > 0 },
    { title: 'Покупки', value: stats.pendingPurchases, sub: 'на согласовании', href: '/company-admin/purchases', color: '#ffb3c6', alert: stats.pendingPurchases > 0 },
    { title: 'Товары', value: stats.rewards, sub: 'в магазине', href: '/company-admin/rewards', color: '#4ade80' },
    { title: 'Цели и мастерство', value: null, sub: 'KPI, пороги, тренинги', href: '/company-admin/mastery', color: '#c084fc' },
    { title: 'Глобальные цели', value: null, sub: 'цели на период', href: '/company-admin/goals', color: '#FFD700' },
    { title: 'Результаты', value: null, sub: 'аналитика команды', href: '/company-admin/results', color: '#a0e9ff' },
    { title: 'Уровни прогресса', value: null, sub: 'архитектура роста', href: '/company-admin/progress', color: '#c084fc' },
    { title: 'Ресурсы', value: null, sub: 'фонд и тарифы', href: '/company-admin/resources', color: '#FFD700' },
    { title: 'Фонд компании', value: null, sub: 'эмиссия', href: '/company-admin/karma', color: '#FFD700' },
    { title: 'Адаптация', value: null, sub: 'планы новичков', href: '/company-admin/adaptation', color: '#4ade80' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 32, background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Панель управления</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {cards.map(c => (
            <div key={c.title} onClick={() => router.push(c.href)}
              style={{ background: 'rgba(15,20,35,0.8)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: 20, cursor: 'pointer', position: 'relative', border: `1px solid ${c.alert ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.25s ease' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.boxShadow = `0 0 18px ${c.color}44`; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = c.alert ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}>
              {c.value !== null && <div style={{ fontSize: 30, fontWeight: 700, color: c.color }}>{c.value}</div>}
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginTop: c.value !== null ? 4 : 0 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{c.sub}</div>
              {c.alert && <span style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 8px rgba(249,115,22,0.9)', animation: 'pulse 2s infinite' }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export default withAuth(CompanyAdminDashboard, { anyStaff: true })
