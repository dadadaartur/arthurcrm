import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '8px 18px', color: '#fff', cursor: 'pointer', fontSize: 12, transition: 'all .25s' }

export default function LevelPathModal({ open, onClose, energy = 0, canEdit = false }) {
  const [levels, setLevels] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', energy_threshold: '', color: '#FFD700', description: '' })
  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }
  const load = async () => { const h = await auth(); const r = await fetch('/api/kpi/levels', { headers: h }); if (r.ok) setLevels(await r.json()) }
  useEffect(() => { if (open) load() }, [open])
  const save = async () => {
    const h = await auth()
    const body = { name: form.name, energy_threshold: Number(form.energy_threshold) || 0, color: form.color, description: form.description }
    if (editingId) await fetch('/api/kpi/levels', { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...body }) })
    else await fetch('/api/kpi/levels', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setForm({ name: '', energy_threshold: '', color: '#FFD700', description: '' }); setEditingId(null); load()
  }
  const del = async (id) => { const h = await auth(); await fetch('/api/kpi/levels', { method: 'DELETE', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); load() }
  if (!open) return null
  let currentIdx = -1
  levels.forEach((l, i) => { if (energy >= l.energy_threshold) currentIdx = i })
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 680, maxHeight: '88vh', overflowY: 'auto', background: 'linear-gradient(145deg, #152238, #0a1628)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 19, fontWeight: 600, margin: 0, background: 'linear-gradient(135deg, #FFD700, #a0e9ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Путь прогресса в компании</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#88
