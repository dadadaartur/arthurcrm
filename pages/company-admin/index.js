import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import { withAuth } from '../../components/withAuth'

function CompanyAdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ tasks: 0, employees: 0, goals: 0 })

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
      const compId = profile.company_id
      const [tasksRes, employeesRes, goalsRes] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('company_id', compId).eq('is_active', true),
        supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('company_id', compId).is('deleted_at', null).eq('is_company_admin', false),
        supabase.from('goals').select('id', { count: 'exact', head: true }).eq('company_id', compId).or('is_active.eq.true,status.eq.active')
      ])
      setStats({
        tasks: tasksRes.count || 0,
        employees: employeesRes.count || 0,
        goals: goalsRes.count || 0
      })
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spinner /></div>

  const links = [
    { href: '/company-admin/tasks', label: 'Управление заданиями' },
    { href: '/company-admin/employees', label: 'Управление командой' },
    { href: '/company-admin/goals', label: 'Управление целями' },
    { href: '/company-admin/review', label: 'Задания на проверке' },
    { href: '/company-admin/history', label: 'История заданий' },
    { href: '/company-admin/rewards', label: 'Управление товарами' },
    { href: '/company-admin/purchases', label: 'Подтверждение сертификатов' },
    { href: '/company-admin/onboarding', label: 'Планы адаптации' }
  ]

  return (
    <div style={{ minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 20px', position: 'relative' }}>
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: 28, fontWeight: 600, marginBottom: 32,
          background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>Панель управления</h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <div style={{ background: 'rgba(15,20,35,0.8)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: 24, flex: '1 1 150px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#FFD700' }}>{stats.tasks}</div>
            <div style={{ fontSize: 14, color: '#aaa' }}>заданий</div>
          </div>
          <div style={{ background: 'rgba(15,20,35,0.8)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: 24, flex: '1 1 150px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#FFD700' }}>{stats.employees}</div>
            <div style={{ fontSize: 14, color: '#aaa' }}>сотрудников</div>
          </div>
          <div style={{ background: 'rgba(15,20,35,0.8)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: 24, flex: '1 1 150px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#FFD700' }}>{stats.goals}</div>
            <div style={{ fontSize: 14, color: '#aaa' }}>целей</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 50, padding: '10px 24px', color: '#fff', fontSize: 14, textDecoration: 'none' }}>{l.label}</Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default withAuth(CompanyAdminDashboard, { anyStaff: true })
