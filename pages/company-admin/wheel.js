import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import CannonPrizeGame from '../../components/CannonPrizeGame'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const ghostBtn = { background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12, padding: '8px 16px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#ea580c'; e.currentTarget.style.boxShadow = '0 0 14px rgba(138,98,8,0.18)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.boxShadow = 'none' }
const PALETTE = ['#ea580c', '#0e7490', '#7c3aed', '#137a39', '#be123c', '#dc2626', '#475569', '#15803d', '#2563eb', '#b45309']
const newId = () => 'p_' + Math.random().toString(36).slice(2, 8)

function WheelAdmin() {
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState(null)
  const [colorPickerFor, setColorPickerFor] = useState(null)
  const [uploadingFor, setUploadingFor] = useState(null)
  const [previewSpinning, setPreviewSpinning] = useState(false)
  const [previewResult, setPreviewResult] = useState(null)

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

  const addPrize = () => setConfig(c => ({ ...c, prizes: [...c.prizes, { id: newId(), label: 'Новый приз', color: PALETTE[c.prizes.length % PALETTE.length], weight: 1, rewards: [{ type: 'karma', amount: 50, label: '' }], avatar_url: '', description: '' }] }))
  const updatePrize = (id, patch) => setConfig(c => ({ ...c, prizes: c.prizes.map(p => p.id === id ? { ...p, ...patch } : p) }))
  const removePrize = id => setConfig(c => ({ ...c, prizes: c.prizes.filter(p => p.id !== id) }))
  const addReward = (prizeId) => setConfig(c => ({ ...c, prizes: c.prizes.map(p => p.id === prizeId ? { ...p, rewards: [...(p.rewards || []), { type: 'karma', amount: 10, label: '' }] } : p) }))
  const updateReward = (prizeId, idx, patch) => setConfig(c => ({ ...c, prizes: c.prizes.map(p => p.id === prizeId ? { ...p, rewards: p.rewards.map((r, i) => i === idx ? { ...r, ...patch } : r) } : p) }))
  const removeReward = (prizeId, idx) => setConfig(c => ({ ...c, prizes: c.prizes.map(p => p.id === prizeId ? { ...p, rewards: p.rewards.filter((_, i) => i !== idx) } : p) }))

  // Превью — тот же принцип взвешенного случайного выбора, что на
  // сервере (pages/api/wheel/spin.js), но локально: это демонстрация
  // для админа, не настоящее вращение, попытки сотрудников не тратит.
  const previewSpin = (spinTo) => {
    if (previewSpinning) return
    setPreviewResult(null)
    setPreviewSpinning(true)
    const totalWeight = config.prizes.reduce((s, p) => s + (Number(p.weight) || 0), 0)
    let roll = Math.random() * (totalWeight || 1)
    let prize = config.prizes[config.prizes.length - 1]
    for (const p of config.prizes) {
      roll -= Number(p.weight) || 0
      if (roll <= 0) { prize = p; break }
    }
    spinTo(prize.id)
    setTimeout(() => { setPreviewResult(prize); setPreviewSpinning(false) }, 4300)
  }

  const uploadAvatar = async (id, file) => {
    setUploadingFor(id)
    try {
      const ext = file.name.split('.').pop()
      const path = `public/prize-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file)
      if (upErr) { showError('Не удалось загрузить изображение'); return }
      const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      updatePrize(id, { avatar_url: url })
    } finally { setUploadingFor(null) }
  }

  if (loading || !config) return <LoadingScreen />

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Пушка призов" extra={
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
            {config.prizes.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                  Вес — это «во сколько раз чаще» относительно других призов, не проценты напрямую. Пример: обычный приз с весом 10 и редкий с весом 1 — редкий выпадает примерно в 10 раз реже. Для дорогого редкого приза ставьте маленький вес (1) рядом с обычными весом побольше (5–10).
                </p>
                <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  {config.prizes.map(p => {
                    const total = config.prizes.reduce((s, x) => s + (Number(x.weight) || 0), 0)
                    const pct = total > 0 ? (Number(p.weight) || 0) / total * 100 : 0
                    return pct > 0 ? <div key={p.id} style={{ width: `${pct}%`, background: p.color }} /> : null
                  })}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                  {config.prizes.map(p => {
                    const total = config.prizes.reduce((s, x) => s + (Number(x.weight) || 0), 0)
                    const pct = total > 0 ? Math.round((Number(p.weight) || 0) / total * 100) : 0
                    return (
                      <span key={p.id} style={{ fontSize: 10.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                        {p.label || 'Без названия'}: {pct}%
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, marginBottom: 16 }}>
              {config.prizes.map(p => (
                <div key={p.id} style={{ borderRadius: 14, background: 'var(--bg-page)', border: '1px solid var(--border-subtle)', padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, position: 'relative' }}>
                    <button type="button" onClick={() => setColorPickerFor(f => f === p.id ? null : p.id)} title="Выбрать цвет"
                      style={{ width: 20, height: 20, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'block', border: '2px solid rgba(15,23,42,0.15)', cursor: 'pointer', padding: 0 }} />
                    {colorPickerFor === p.id && (
                      <div style={{ position: 'absolute', top: 26, left: 0, zIndex: 10, display: 'flex', flexWrap: 'wrap', gap: 5, width: 150, padding: 8, borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card-hover)' }}>
                        {PALETTE.map(c => (
                          <button key={c} type="button" onClick={() => { updatePrize(p.id, { color: c }); setColorPickerFor(null) }}
                            style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: c === p.color ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                        ))}
                        <label style={{ width: 18, height: 18, borderRadius: '50%', cursor: 'pointer', border: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Свой цвет">
                          <input type="color" value={p.color} onChange={e => updatePrize(p.id, { color: e.target.value })} style={{ opacity: 0, width: 1, height: 1, position: 'absolute' }} />
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>+</span>
                        </label>
                      </div>
                    )}
                    <input className="input-field" style={{ fontSize: 12.5, flex: 1, fontWeight: 600 }} placeholder="Название приза" value={p.label} onChange={e => updatePrize(p.id, { label: e.target.value })} />
                    <button onClick={() => removePrize(p.id)} style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, color: '#dc2626', cursor: 'pointer', padding: 6, flexShrink: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </div>

                  <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Вес — во сколько раз этот приз выпадает чаще приза с весом 1</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <input type="number" step="0.1" className="input-field" style={{ fontSize: 12, width: 90 }} value={p.weight} onChange={e => updatePrize(p.id, { weight: e.target.value })} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)' }}>
                      = {config.prizes.reduce((s, x) => s + (Number(x.weight) || 0), 0) > 0 ? Math.round((Number(p.weight) || 0) / config.prizes.reduce((s, x) => s + (Number(x.weight) || 0), 0) * 100) : 0}% шанс
                    </span>
                  </div>

                  <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Что получает сотрудник — можно несколько сразу</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                    {(p.rewards || []).map((rw, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <select className="input-field" style={{ fontSize: 11, width: 100, flexShrink: 0 }} value={rw.type} onChange={e => updateReward(p.id, i, { type: e.target.value })}>
                          <option value="karma">Кармики</option>
                          <option value="promo">Промокод</option>
                          <option value="custom">Свой приз</option>
                        </select>
                        {rw.type === 'karma' ? (
                          <input type="number" className="input-field" style={{ fontSize: 11, flex: 1 }} placeholder="Сколько" value={rw.amount || ''} onChange={e => updateReward(p.id, i, { amount: e.target.value })} />
                        ) : (
                          <input className="input-field" style={{ fontSize: 11, flex: 1 }} placeholder={rw.type === 'promo' ? 'Код промокода' : 'Например: доп. выходной'} value={rw.text || ''} onChange={e => updateReward(p.id, i, { text: e.target.value })} />
                        )}
                        <button onClick={() => removeReward(p.id, i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addReward(p.id)} style={{ fontSize: 10.5, color: 'var(--accent-gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginBottom: 10 }}>+ Ещё награда в этот приз</button>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, cursor: 'pointer', border: '1px dashed var(--border-gold)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} title="Загрузить аватар приза">
                      {uploadingFor === p.id ? (
                        <span style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid rgba(138,98,8,0.25)', borderTopColor: '#ea580c', animation: 'wheelSpin 0.7s linear infinite' }} />
                      ) : p.avatar_url ? (
                        <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                      )}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadAvatar(p.id, e.target.files[0])} />
                    </label>
                    <input className="input-field" style={{ fontSize: 11, flex: 1 }} placeholder="Описание (в историю покупок)" value={p.description || ''} onChange={e => updatePrize(p.id, { description: e.target.value })} />
                  </div>
                </div>
              ))}
              {config.prizes.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Призов пока нет — добавьте хотя бы один, чтобы включить ленту.</p>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={addPrize} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>+ Приз</button>
              <button onClick={save} style={{ ...ghostBtn, borderColor: 'rgba(19,122,57,0.4)', color: '#137a39' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить</button>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 26, border: '1px solid var(--border-gold)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>Предпросмотр</div>
            {config.prizes.length > 0 ? (
              <CannonPrizeGame prizes={config.prizes} onSpin={previewSpin} spinning={previewSpinning} result={previewResult} />
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Добавьте призы, чтобы увидеть ленту</p>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes wheelSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default withAuth(WheelAdmin, { permission: 'can_manage_employees' })
