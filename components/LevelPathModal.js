import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '8px 18px', color: '#fff', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }

export default function LevelPathModal({ open, onClose, energy = 0, canEdit = false }) {
  const [levels, setLevels] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', energy_threshold: '', color: '#FFD700', description: '' })

  const auth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session.access_token}` }
  }
  const load = async () => {
    const h = await auth()
    const r = await fetch('/api/kpi/levels', { headers: h })
    if (r.ok) setLevels(await r.json())
  }
  useEffect(() => { if (open) load() }, [open])

  const save = async () => {
    if (!form.name) return
    const h = await auth()
    const body = { name: form.name, energy_threshold: Number(form.energy_threshold) || 0, color: form.color || '#FFD700', description: form.description || '' }
    if (editingId) {
      await fetch('/api/kpi/levels', { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...body }) })
    } else {
      await fetch('/api/kpi/levels', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setForm({ name: '', energy_threshold: '', color: '#FFD700', description: '' })
    setEditingId(null)
    load()
  }
  const del = async (id) => {
    const h = await auth()
    await fetch('/api/kpi/levels', { method: 'DELETE', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  if (!open) return null
  let currentIdx = -1
  levels.forEach((l, i) => { if (Number(energy) >= Number(l.energy_threshold)) currentIdx = i })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 680, maxHeight: '88vh', overflowY: 'auto', background: 'linear-gradient(145deg, #152238, #0a1628)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 19, fontWeight: 600, margin: 0, background: 'linear-gradient(135deg, #FFD700, #a0e9ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Путь прогресса в компании</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {levels.map((l, i) => {
            const isCurrent = i === currentIdx
            const isPassed = i < currentIdx
            const isNext = i === currentIdx + 1
            return (
              <div key={l.id} style={{ display: 'flex', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: isPassed || isCurrent ? l.color : 'rgba(255,255,255,0.1)', border: `2px solid ${l.color}`, boxShadow: isCurrent ? `0 0 14px ${l.color}` : 'none', flexShrink: 0 }} />
                  {i < levels.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 26, background: isPassed ? l.color : 'rgba(255,255,255,0.1)' }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 18, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: isCurrent ? l.color : '#fff' }}>{l.name}</span>
                    <span style={{ fontSize: 11, color: '#888' }}>от {l.energy_threshold} энергии</span>
                    {isCurrent && <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: `${l.color}22`, color: l.color, border: `1px solid ${l.color}55`, whiteSpace: 'nowrap' }}>вы здесь</span>}
                    {isNext && <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: '#aaa', border: '1px solid rgba(255,255,255,0.15)', whiteSpace: 'nowrap' }}>ещё {l.energy_threshold - energy} энергии</span>}
                  </div>
                  {l.description && <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>{l.description}</p>}
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button onClick={() => { setEditingId(l.id); setForm({ name: l.name, energy_threshold: l.energy_threshold, color: l.color, description: l.description || '' }) }} style={{ ...ghostBtn, padding: '4px 12px', fontSize: 11 }}>Изменить</button>
                      <button onClick={() => del(l.id)} style={{ ...ghostBtn, padding: '4px 12px', fontSize: 11, borderColor: 'rgba(244,67,54,0.4)', color: '#f87171' }}>Удалить</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {levels.length === 0 && <p style={{ color: '#777', fontSize: 13 }}>Уровни ещё не настроены.</p>}
        </div>

        {canEdit && (
          <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 10px' }}>{editingId ? 'Изменить уровень' : 'Добавить уровень'}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px', gap: 8 }}>
              <input className="input-field" placeholder="Название уровня" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input className="input-field" type="number" placeholder="Энергия" value={form.energy_threshold} onChange={e => setForm({ ...form, energy_threshold: e.target.value })} />
              <input className="input-field" type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ padding: 4 }} />
            </div>
            <input className="input-field" style={{ width: '100%', marginTop: 8 }} placeholder="Описание уровня (что означает, привилегии)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={save} style={ghostBtn}>Сохранить</button>
              {editingId && <button onClick={() => { setEditingId(null); setForm({ name: '', energy_threshold: '', color: '#FFD700', description: '' }) }} style={ghostBtn}>Отмена</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
