import { useEffect, useState } from 'react'
import BackArrow from '../../components/BackArrow'
import LoadingScreen from '../../components/LoadingScreen'
import { supabase } from '../../lib/supabaseClient'
import { withAuth } from '../../components/withAuth'

function PersonalGoalsReport() {
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/company-admin/personal-goals-report', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (r.ok) setEmployees((await r.json()).employees || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <LoadingScreen />

  return (
    <div className="theme-light" style={{ minHeight: '100vh', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Личные цели команды" />
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 640 }}>
          Цели, которые сотрудники поставили себе сами — только просмотр, редактировать чужие личные цели нельзя, это личное пространство сотрудника.
        </p>

        {employees.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Пока никто не поставил себе личных целей</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {employees.map(emp => (
              <div key={emp.userId} style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>{emp.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {emp.goals.map(g => (
                    <div key={g.id} style={{ padding: 10, borderRadius: 10, background: 'var(--bg-page)', border: g.goal_type === 'global' ? '1px solid var(--border-gold)' : '1px solid transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{g.title}</span>
                        {g.goal_type === 'global' && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent-gold)' }}>Глобальная</span>}
                      </div>
                      {g.target_value != null ? (
                        <>
                          <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-card)', overflow: 'hidden', marginBottom: 3 }}>
                            <div style={{ height: '100%', width: `${g.progressPct}%`, borderRadius: 3, background: 'linear-gradient(90deg, #ea580c, #7c3aed)' }} />
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>{g.current_value}{g.target_unit} из {g.target_value}{g.target_unit} ({g.progressPct}%)</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>без числового прогресса</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
export default withAuth(PersonalGoalsReport, { permission: 'can_manage_employees' })
