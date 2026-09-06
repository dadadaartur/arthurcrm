import { useEffect, useState } from 'react'
import BackArrow from '../../components/BackArrow'
import LoadingScreen from '../../components/LoadingScreen'
import { supabase } from '../../lib/supabaseClient'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

function PeerTasksModeration() {
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('pending')

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }
  const load = async () => {
    const h = await auth()
    const r = await fetch('/api/company-admin/peer-tasks', { headers: h })
    if (r.ok) setTasks((await r.json()).tasks || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const review = async (id, action) => {
    const h = await auth()
    const r = await fetch('/api/company-admin/peer-tasks', { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) })
    if (r.ok) { showSuccess(action === 'approve' ? 'Задание опубликовано' : 'Заявка отклонена'); load() }
    else showError('Не удалось обработать заявку')
  }

  if (loading) return <LoadingScreen />
  const shown = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)
  const pendingCount = tasks.filter(t => t.status === 'pending').length

  return (
    <div className="theme-light" style={{ minHeight: '100vh', padding: '40px 32px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Шуточные задания на модерации" extra={
          pendingCount > 0 && <div style={{ marginLeft: 'auto', fontSize: 12, color: '#8a6208' }}>Ждут решения: <b>{pendingCount}</b></div>
        } />
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, maxWidth: 600 }}>
          Заявки от победителей месячной гонки — привилегия создать небольшое весёлое задание коллегам. Публикация создаёт обычное задание в общем списке только после вашего подтверждения.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['pending', 'approved', 'rejected', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: `1px solid ${filter === f ? 'var(--border-gold)' : 'var(--border-subtle)'}`, background: filter === f ? 'rgba(184,134,11,0.08)' : 'var(--bg-card)', color: filter === f ? '#8a6208' : 'var(--text-secondary)', cursor: 'pointer' }}>
              {{ pending: 'Ждут решения', approved: 'Одобрены', rejected: 'Отклонены', all: 'Все' }[f]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shown.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Пусто</p>}
          {shown.map(t => (
            <div key={t.id} style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 14, padding: 18, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{t.title}</h3>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>+{t.reward_karma} карм.</span>
              </div>
              {t.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px' }}>{t.description}</p>}
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 12px' }}>От {t.authorName} · кому: {t.targetNames.join(', ')}</p>
              {t.status === 'pending' ? (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => review(t.id, 'reject')} className="btn-outline" style={{ flex: 1 }}>Отклонить</button>
                  <button onClick={() => review(t.id, 'approve')} className="btn-gold" style={{ flex: 1 }}>Одобрить и опубликовать</button>
                </div>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 600, color: t.status === 'approved' ? '#137a39' : '#dc2626' }}>{t.status === 'approved' ? 'Опубликовано' : 'Отклонено'}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export default withAuth(PeerTasksModeration, { permission: 'can_manage_employees' })
