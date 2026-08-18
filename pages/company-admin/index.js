import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import DateRangePicker from '../../components/DateRangePicker'
import { withAuth } from '../../components/withAuth'
import { useProfile } from '../../context/ProfileContext'
import { roleLabel } from '../../lib/permissions'

function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const inRange = (iso, r) => {
  if (!iso) return false
  if (!r.from && !r.to) return true
  const d = iso.slice(0, 10)
  if (r.from && d < r.from) return false
  if (r.to && d > r.to) return false
  return true
}

function CompanyAdminDashboard() {
  const router = useRouter()
  const { profile: myProfile } = useProfile()
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState(null)
  const [stats, setStats] = useState({ tasks: 0, employees: 0, goals: 0, rewards: 0, pendingReviews: 0, pendingPurchases: 0 })
  const [range, setRange] = useState(() => {
    const t = new Date(); const f = new Date(); f.setDate(f.getDate() - 29)
    return { from: toISO(f), to: toISO(t) }
  })
  const [analytics, setAnalytics] = useState({ doneTasks: 0, karmaAwarded: 0, purchases: 0, circulation: 0 })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (!profile) { router.push('/'); return }
      setCompanyId(profile.company_id)
      await loadCounts(profile.company_id)
      setLoading(false)
    }
    init()
  }, [])

  const loadCounts = async (compId) => {
    const [tasksRes, empRes, goalsRes, rewardsRes] = await Promise.all([
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('company_id', compId).eq('is_active', true),
      supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('company_id', compId).is('deleted_at', null).eq('is_company_admin', false),
      supabase.from('goals').select('id', { count: 'exact', head: true }).eq('company_id', compId).eq('is_active', true),
      supabase.from('rewards').select('id', { count: 'exact', head: true }).eq('company_id', compId)
    ])
    const { data: tasks } = await supabase.from('tasks').select('id').eq('company_id', compId)
    const taskIds = (tasks || []).map(t => t.id)
    let pendingReviews = 0
    if (taskIds.length) {
      const { count } = await supabase.from('task_assignments').select('id', { count: 'exact', head: true }).in('task_id', taskIds).eq('status', 'pending_review')
      pendingReviews = count || 0
    }
    const { data: employees } = await supabase.from('profiles').select('user_id').eq('company_id', compId).is('deleted_at', null)
    const userIds = (employees || []).map(e => e.user_id)
    let pendingPurchases = 0
    if (userIds.length) {
      const { count } = await supabase.from('purchases').select('id', { count: 'exact', head: true }).in('user_id', userIds).in('status', ['pending', 'new'])
      pendingPurchases = count || 0
    }
    setStats({
      tasks: tasksRes.count || 0,
      employees: empRes.count || 0,
      goals: goalsRes.count || 0,
      rewards: rewardsRes.count || 0,
      pendingReviews,
      pendingPurchases
    })
  }

  useEffect(() => {
    if (companyId) loadAnalytics(companyId, range)
  }, [companyId, range])

  const loadAnalytics = async (compId, r) => {
    const { data: tasks } = await supabase.from('tasks').select('id, reward_karma').eq('company_id', compId)
    const taskMap = Object.fromEntries((tasks || []).map(t => [t.id, t.reward_karma || 0]))
    const taskIds = Object.keys(taskMap)
    let done = 0, karma = 0
    if (taskIds.length) {
      const { data } = await supabase.from('task_assignments')
        .select('task_id, completed_at').in('task_id', taskIds).eq('status', 'completed').limit(1000)
      ;(data || []).forEach(a => {
        if (inRange(a.completed_at, r)) { done++; karma += taskMap[a.task_id] || 0 }
      })
    }
    const { data: employees } = await supabase.from('profiles')
      .select('user_id, karma_balance(balance)').eq('company_id', compId).is('deleted_at', null)
    const circulation = (employees || []).reduce((s, e) => s + (e.karma_balance?.balance || 0), 0)
    const userIds = (employees || []).map(e => e.user_id)
    let purchases = 0
    if (userIds.length) {
      const { data } = await supabase.from('purchases')
        .select('created_at, status').in('user_id', userIds).neq('status', 'rejected').limit(1000)
      ;(data || []).forEach(p => { if (inRange(p.created_at, r)) purchases++ })
    }
    setAnalytics({ doneTasks: done, karmaAwarded: karma, purchases, circulation })
  }

  if (loading) return <div className="flex justify-center items-center py-24"><Spinner /></div>

  const cards = [
    { title: 'Команда', value: stats.employees, sub: 'сотрудников', href: '/company-admin/employees', color: '#a0e9ff' },
    { title: 'Задания', value: stats.tasks, sub: 'активных', href: '/company-admin/tasks', color: '#FFD700' },
    { title: 'Цели', value: stats.goals, sub: 'поставлено', href: '/company-admin/goals', color: '#c084fc' },
    { title: 'Проверки', value: stats.pendingReviews, sub: 'ждут решения', href: '/company-admin/review', color: '#f97316', alert: stats.pendingReviews > 0 },
    { title: 'Покупки', value: stats.pendingPurchases, sub: 'на согласовании', href: '/company-admin/purchases', color: '#ffb3c6', alert: stats.pendingPurchases > 0 },
    { title: 'Товары', value: stats.rewards, sub: 'в магазине', href: '/company-admin/rewards', color: '#4ade80' },
    { title: 'Ресурсы', value: null, sub: 'фонд и тарифы', href: '/company-admin/resources', color: '#a0e9ff' },
    { title: 'Казна', value: null, sub: 'эмиссия', href: '/company-admin/karma', color: '#FFD700' },
    { title: 'Адаптация', value: null, sub: 'планы', href: '/company-admin/onboarding', color: '#c084fc' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 20px', position: 'relative' }}>
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 600, background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Панель управления
            </h1>
            <p className="text-sm text-gray-400 mt-1">Роль: {roleLabel(myProfile)}</p>
          </div>
          <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
        </div>

        {/* Кликабельные карточки-разделы */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginBottom: 32 }}>
          {cards.map(c => (
            <div
              key={c.title}
              onClick={() => router.push(c.href)}
              style={{
                background: 'rgba(15,20,35,0.8)', backdropFilter: 'blur(10px)', borderRadius: 16,
                padding: 20, cursor: 'pointer', position: 'relative',
                border: `1px solid ${c.alert ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.1)'}`,
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.boxShadow = `0 0 18px ${c.color}44`; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = c.alert ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
            >
              {c.value !== null && (
                <div style={{ fontSize: 30, fontWeight: 700, color: c.color }}>{c.value}</div>
              )}
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginTop: c.value !== null ? 4 : 0 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{c.sub}</div>
              {c.alert && (
                <span style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 8px rgba(249,115,22,0.9)', animation: 'pulse 2s infinite' }} />
              )}
            </div>
          ))}
        </div>

        {/* Аналитика за период */}
        <div className="premium-card">
          <h3 className="text-lg font-semibold mb-4 text-white">Активность за период</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 18, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#4ade80' }}>{analytics.doneTasks}</div>
              <div style={{ fontSize: 13, color: '#aaa', marginTop: 2 }}>заданий выполнено</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 18, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#FFD700' }}>{analytics.karmaAwarded}</div>
              <div style={{ fontSize: 13, color: '#aaa', marginTop: 2 }}>кармиков начислено</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 18, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#ffb3c6' }}>{analytics.purchases}</div>
              <div style={{ fontSize: 13, color: '#aaa', marginTop: 2 }}>покупок совершено</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 18, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#c084fc' }}>{analytics.circulation}</div>
              <div style={{ fontSize: 13, color: '#aaa', marginTop: 2 }}>кармиков в обороте</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default withAuth(CompanyAdminDashboard, { anyStaff: true })
