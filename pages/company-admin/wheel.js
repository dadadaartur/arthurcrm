import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import WheelOfFortune from '../../components/WheelOfFortune'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const ghostBtn = { background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12, padding: '8px 16px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#8a6208'; e.currentTarget.style.boxShadow = '0 0 14px rgba(138,98,8,0.18)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.boxShadow = 'none' }
const PALETTE = ['#FFD700', '#a0e9ff', '#c084fc', '#4ade80', '#f87171', '#ffb3c6', '#fda4af', '#e2e8f0']
const newId = () => 'p_' + Math.random().toString(36).slice(2, 8)

function WheelAdmin() {
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState(null)

  const auth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Сессия истекла — обновите страницу')
    return { Authorization: `Bearer ${session.access_token}` }
  }

  const load = async () => {
    try {
      const h = await auth()
      const r = await fetch('/api/company-admin/wheel-config', { headers: h })
      const d = await r.json()
      setConfig({ ...d, prizes: d.prizes?.length ? d.prizes : [] })
    } catch (e) { showError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    try {
      const h = await auth()
      const r = await fetch('/api/company-admin/wheel-config', { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(config) })
      const d = await r.json()
      if (!r.ok) { showError(d.error || 'Не удалось сохранить'); return }
      showSuccess('Настройки колеса сохранены')
    } catch (e) { showError(e.message) }
  }

  const addPrize = () => setConfig(c => ({ ...c, prizes: [...c.prizes, { id: newId(), label: 'Новый приз', color: PALETTE[c.prizes.length % PALETTE.length], weight: 1, type: 'karma', amount: 50, text: '' }] }))
  const updatePrize = (id, patch) => setConfig(c => ({ ...c, prizes: c.prizes.map(p => p.id === id ? { ...p, ...patch } : p) }))
  const removePrize = id => setConfig(c => ({ ...c, prizes: c.prizes.filter(p => p.id !== id) }))

  if (loading || !config) return <LoadingScreen />

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Колесо фортуны" extra={
          <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: config.enabled ? '#137a39' : 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={config.enabled} onChange={e => setConfig({ ...config, enabled: e.target.checked })} style={{ accentColor: '#137a39' }} />
            {config.enabled ? 'Включено' : 'Выключено'}
          </label>
        } />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 26, border: '1px solid var(--border-subtle)' }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Попытка даётся за каждые N пройденных уровней мастерства</label>
              <input type="number" min="1" className="input-field" style={{ width: 120 }} value={config.levels_per_spin} onChange={e => setConfig({ ...config, levels_per_spin: parseInt(e.target.value) || 1 })} />
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Призы</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {config.prizes.map(p => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '30px 1.3fr 0.6fr 0.9fr 1fr 30px', gap: 8, alignItems: 'center', padding: '10px 12px', borderRadius: 12, background: 'var(--bg-page)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: p.color, margin: '0 auto', display: 'block', border: '2px solid rgba(15,23,42,0.15)' }} />
                  <input className="input-field" style={{ fontSize: 12 }} placeholder="Название приза" value={p.label} onChange={e => updatePrize(p.id, { label: e.target.value })} />
                  <input type="number" step="0.1" className="input-field" style={{ fontSize: 12 }} placeholder="Вес" title="Вес — относительная вероятность выпадения" value={p.weight} onChange={e => updatePrize(p.id, { weight: e.target.value })} />
                  <select className="input-field" style={{ fontSize: 12 }} value={p.type} onChange={e => updatePrize(p.id, { type: e.target.value })}>
                    <option value="karma">Кармики</option>
                    <option value="custom">Свой приз (текст)</option>
                  </select>
                  {p.type === 'karma' ? (
                    <input type="number" className="input-field" style={{ fontSize: 12 }} placeholder="Сколько кармиков" value={p.amount} onChange={e => updatePrize(p.id, { amount: e.target.value })} />
                  ) : (
                    <input className="input-field" style={{ fontSize: 12 }} placeholder="Например: доп. выходной" value={p.text} onChange={e => updatePrize(p.id, { text: e.target.value })} />
                  )}
                  <button onClick={() => removePrize(p.id)} style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, color: '#dc2626', cursor: 'pointer', padding: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              {config.prizes.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Призов пока нет — добавьте хотя бы один, чтобы включить колесо.</p>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={addPrize} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>+ Приз</button>
              <button onClick={save} style={{ ...ghostBtn, borderColor: 'rgba(19,122,57,0.4)', color: '#137a39' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить</button>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 26, border: '1px solid var(--border-gold)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>Предпросмотр</div>
            {config.prizes.length > 0 ? (
              <WheelOfFortune prizes={config.prizes} onSpin={() => {}} spinning={false} result={null} />
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Добавьте призы, чтобы увидеть колесо</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default withAuth(WheelAdmin, { permission: 'can_manage_employees' })
