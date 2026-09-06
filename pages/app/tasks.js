import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell'
import { supabase } from '../../lib/supabaseClient'
import { useProfile } from '../../context/ProfileContext'
import { BAND_COLORS, BAND_LABELS } from '../../lib/kpi'

const TABS = [
  { key: 'active', label: 'Активные' },
  { key: 'review', label: 'На проверке' },
  { key: 'history', label: 'История' },
]

export default function AppTasks() {
  const { user } = useProfile()
  const [tab, setTab] = useState('active')
  const [active, setActive] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch('/api/tasks/my', { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (r.ok) {
      const d = await r.json()
      setActive(d.active || [])
      setHistory(d.history || [])
    }
    setLoading(false)
  }

  const [starting, setStarting] = useState(null)

  const handleStart = async (id) => {
    setStarting(id)
    await supabase.from('task_assignments').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', id).eq('status', 'assigned')
    await load()
    setStarting(null)
  }

  const shown = tab === 'history' ? history : active.filter(a => {
    if (a.tasks?.is_auto_goal) return tab === 'active'
    if (tab === 'active') return a.status === 'assigned' || a.status === 'in_progress'
    if (tab === 'review') return a.status === 'pending_review'
    return false
  })

  return (
    <AppShell title="Задания" active="tasks">
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flexShrink: 0, padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: tab === t.key ? 700 : 500,
            background: tab === t.key ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${tab === t.key ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
            color: tab === t.key ? '#FFD700' : '#999'
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#777', fontSize: 13 }}>Загрузка...</p>
      ) : shown.length === 0 ? (
        <p style={{ color: '#777', fontSize: 13, textAlign: 'center', marginTop: 40 }}>Пусто</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map(item => {
            const t = item.tasks
            const ap = item.autoProgress
            const isHistory = tab === 'history'
            return (
              <div key={item.id} style={{ borderRadius: 16, padding: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{t?.title}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#FFD700', flexShrink: 0 }}>+{t?.reward_karma}</span>
                </div>

                {isHistory ? (
                  <span style={{ display: 'inline-block', marginTop: 6, fontSize: 10, padding: '2px 10px', borderRadius: 20, background: item.status === 'completed' ? 'rgba(74,222,128,0.15)' : 'rgba(244,67,54,0.15)', color: item.status === 'completed' ? '#4ade80' : '#f87171' }}>
                    {item.status === 'completed' ? 'Выполнено' : 'Отклонено'}
                  </span>
                ) : t?.is_auto_goal ? (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>Выполнение засчитается автоматически</span>
                    {ap && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{ width: `${ap.targetValue ? Math.min(100, ap.currentValue / ap.targetValue * 100) : 0}%`, height: '100%', background: BAND_COLORS[ap.currentBand] || '#4ade80' }} />
                        </div>
                        <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>{ap.currentValue}{ap.unit} · {BAND_LABELS[ap.currentBand]}{ap.achievedToday ? ' · выполнено сегодня' : ''}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ marginTop: 10 }}>
                    {item.status === 'assigned' && (
                      <button onClick={() => handleStart(item.id)} disabled={starting === item.id} style={{ fontSize: 12, fontWeight: 600, padding: '8px 18px', borderRadius: 10, background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.4)', color: '#FFD700', opacity: starting === item.id ? 0.6 : 1 }}>
                        {starting === item.id ? 'Начинаем...' : 'Начать'}
                      </button>
                    )}
                    {item.status === 'in_progress' && (
                      <span style={{ fontSize: 11, color: '#f97316' }}>В работе — завершите в полной версии на компьютере</span>
                    )}
                    {item.status === 'pending_review' && (
                      <span style={{ fontSize: 11, color: '#c084fc' }}>Ожидает проверки руководителем</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
