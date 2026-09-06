import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import BackArrow from '../../components/BackArrow'
import LoadingScreen from '../../components/LoadingScreen'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const SOURCE_LABEL = { wheel: 'Лента подарков', partner_task: 'Партнёрское задание' }

function PrizesPage() {
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [awards, setAwards] = useState([])
  const [filter, setFilter] = useState('pending') // pending | all

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch('/api/company-admin/prizes', { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (r.ok) setAwards((await r.json()).awards || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const toggleFulfilled = async (award) => {
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch('/api/company-admin/prizes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id: award.id, fulfilled: !award.fulfilled })
    })
    if (r.ok) { showSuccess(award.fulfilled ? 'Отмечено как невыданное' : 'Отмечено как выдано'); load() }
    else showError('Не удалось обновить')
  }

  if (loading) return <LoadingScreen />
  const shown = filter === 'pending' ? awards.filter(a => !a.fulfilled) : awards
  const pendingCount = awards.filter(a => !a.fulfilled).length

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Выигранные призы" extra={
          pendingCount > 0 && <div style={{ marginLeft: 'auto', fontSize: 12, color: '#dc2626' }}>Не выдано: <b>{pendingCount}</b></div>
        } />

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, maxWidth: 640 }}>
          Все призы, требующие ручной выдачи — из ленты подарков компании и из бонус-призов партнёрских заданий. Кармики, буст к начислениям и доступ к товарам магазина зачисляются автоматически и сюда не попадают — здесь только то, что нужно выдать физически.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={() => setFilter('pending')} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: `1px solid ${filter === 'pending' ? 'var(--border-gold)' : 'var(--border-subtle)'}`, background: filter === 'pending' ? 'rgba(184,134,11,0.08)' : 'var(--bg-card)', color: filter === 'pending' ? '#8a6208' : 'var(--text-secondary)', cursor: 'pointer' }}>Не выдано</button>
          <button onClick={() => setFilter('all')} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: `1px solid ${filter === 'all' ? 'var(--border-gold)' : 'var(--border-subtle)'}`, background: filter === 'all' ? 'rgba(184,134,11,0.08)' : 'var(--bg-card)', color: filter === 'all' ? '#8a6208' : 'var(--text-secondary)', cursor: 'pointer' }}>Все</button>
        </div>

        <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          {shown.length === 0 && <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{filter === 'pending' ? 'Всё выдано — невыданных призов нет' : 'Призов пока не было'}</p>}
          {shown.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '16px 22px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{a.userName} — «{a.label}»</div>
                {a.description && <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>{a.description}</div>}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{SOURCE_LABEL[a.source] || a.source} · {new Date(a.awarded_at).toLocaleDateString('ru')}</div>
              </div>
              <button onClick={() => toggleFulfilled(a)} style={{ flexShrink: 0, fontSize: 12, padding: '7px 16px', borderRadius: 10, border: `1px solid ${a.fulfilled ? 'rgba(19,122,57,0.3)' : 'var(--border-gold)'}`, background: a.fulfilled ? 'rgba(19,122,57,0.08)' : 'rgba(184,134,11,0.08)', color: a.fulfilled ? '#137a39' : '#8a6208', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {a.fulfilled ? 'Выдано' : 'Отметить выданным'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export default withAuth(PrizesPage, { permission: 'can_review_tasks' })
