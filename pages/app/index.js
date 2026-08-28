import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import AppShell from '../../components/AppShell'
import { supabase } from '../../lib/supabaseClient'
import { useProfile } from '../../context/ProfileContext'

export default function AppHome() {
  const router = useRouter()
  const { user } = useProfile()
  const [balance, setBalance] = useState(null)
  const [energy, setEnergy] = useState(0)
  const [levels, setLevels] = useState([])
  const [activeCount, setActiveCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const h = { Authorization: `Bearer ${session.access_token}` }
      const [{ data: bal }, myRes, levelsRes, tasksRes] = await Promise.all([
        supabase.from('karma_balance').select('balance').eq('user_id', user.id).maybeSingle(),
        fetch('/api/kpi/my', { headers: h }),
        fetch('/api/kpi/levels', { headers: h }),
        fetch('/api/tasks/my', { headers: h }),
      ])
      setBalance(bal?.balance || 0)
      if (myRes.ok) { const d = await myRes.json(); setEnergy(d.energy || 0) }
      if (levelsRes.ok) setLevels(await levelsRes.json())
      if (tasksRes.ok) {
        const t = await tasksRes.json()
        setActiveCount((t.active || []).filter(a => a.status !== 'pending_review').length)
        setPendingCount((t.active || []).filter(a => a.status === 'pending_review').length)
      }
    }
    load()
  }, [user])

  // То же самое вычисление, что и на десктопе (pages/goals.js) — единый
  // источник правды не заводил отдельно, просто повторил тот же способ.
  let cur = null
  levels.forEach(l => { if (energy >= l.energy_threshold) cur = l })
  const next = levels.find(l => l.energy_threshold > energy) || null
  const pct = cur && next ? Math.min(100, Math.round((energy - cur.energy_threshold) / (next.energy_threshold - cur.energy_threshold) * 100)) : 100

  return (
    <AppShell title="Главная" active="index">
      {/* Баланс — главный акцент экрана */}
      <div style={{ borderRadius: 20, padding: 22, background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(192,132,252,0.08))', border: '1px solid rgba(255,215,0,0.25)', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Баланс</div>
        <div style={{ fontSize: 38, fontWeight: 800, background: 'linear-gradient(135deg, #FFD700, #fff3c4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {balance === null ? '···' : balance}
        </div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>кармиков</div>
        <button onClick={() => router.push('/transfer')} style={{ marginTop: 14, padding: '9px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, fontWeight: 600 }}>
          Перевести коллеге
        </button>
      </div>

      {/* Уровень мастерства */}
      {cur && (
        <div style={{ borderRadius: 16, padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: cur.color || '#FFD700' }}>{cur.name}</span>
            {next && <span style={{ fontSize: 11, color: '#888' }}>{energy}/{next.energy_threshold} эн.</span>}
          </div>
          <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #FFD700, #c084fc)', borderRadius: 4 }} />
          </div>
        </div>
      )}

      {/* Быстрая сводка заданий */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div onClick={() => router.push('/app/tasks')} style={{ borderRadius: 14, padding: 14, background: 'rgba(160,233,255,0.06)', border: '1px solid rgba(160,233,255,0.2)' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#a0e9ff' }}>{activeCount}</div>
          <div style={{ fontSize: 11, color: '#888' }}>активных заданий</div>
        </div>
        <div onClick={() => router.push('/app/tasks')} style={{ borderRadius: 14, padding: 14, background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.2)' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#c084fc' }}>{pendingCount}</div>
          <div style={{ fontSize: 11, color: '#888' }}>на проверке</div>
        </div>
      </div>
    </AppShell>
  )
}
