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
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('company_id', compId).is('deleted_at', null).not('role_id', 'in', '(1,2)'),
        supabase.from('goals').select('id', { count: 'exact', head: true }).eq('company_id', compId).eq('is_active', true)
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

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 20px', position: 'relative' }}>
      {/* Звёзды */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        {Array.from({ length: 80 }).map((_, i) => {
          const size = Math.random() * 2 + 0.5
          const colors = ['#ffffff', '#ffe0d0', '#ffddaa', '#d0e0ff', '#ffffdd', '#ffe4c4']
          const color = colors[Math.floor(Math.random() * colors.length)]
          return (
            <div key={i} style={{
              position: 'absolute', left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
              width: size + 'px', height: size + 'px', borderRadius: '50%', background: color,
              boxShadow: `0 0 ${size * 2}px ${color}`,
              opacity: Math.random() * 0.5 + 0.3,
              animation: `twinkle ${Math.random() * 10 + 5}s ease-in-out infinite`,
              animationDelay: Math.random() * 10 + 's'
            }} />
          )
        })}
      </div>

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
          <Link href="/company-admin/tasks" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 50, padding: '10px 24px', color: '#fff', fontSize: 14, textDecoration: 'none' }}>Управление заданиями</Link>
          <Link href="/company-admin/employees" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 50, padding: '10px 24px', color: '#fff', fontSize: 14, textDecoration: 'none' }}>Управление командой</Link>
          <Link href="/company-admin/goals" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 50, padding: '10px 24px', color: '#fff', fontSize: 14, textDecoration: 'none' }}>Управление целями</Link>
          <Link href="/company-admin/review" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 50, padding: '10px 24px', color: '#fff', fontSize: 14, textDecoration: 'none' }}>Задания на проверке</Link>
          <Link href="/company-admin/history" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 50, padding: '10px 24px', color: '#fff', fontSize: 14, textDecoration: 'none' }}>История заданий</Link>
          <Link href="/company-admin/rewards" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 50, padding: '10px 24px', color: '#fff', fontSize: 14, textDecoration: 'none' }}>Управление товарами</Link>
          <Link href="/company-admin/purchases" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 50, padding: '10px 24px', color: '#fff', fontSize: 14, textDecoration: 'none' }}>Подтверждение сертификатов</Link>
        </div>
      </div>
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}

export default withAuth(CompanyAdminDashboard, [1, 2])
