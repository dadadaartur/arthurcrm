import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import VideoPlayer from './VideoPlayer'

export default function TrainingVideoModal({ training, onClose }) {
  const [url, setUrl] = useState(null)
  const [err, setErr] = useState('')
  const stateRef = useRef({ time: 0, duration: 0 })

  useEffect(() => {
    if (!training) return
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(`/api/kpi/video?action=sign&id=${training.id}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      const d = await r.json()
      if (r.ok) setUrl(d.url); else setErr(d.error || 'Не удалось получить видео')
    }
    load()
    return () => { logView(false) } // при закрытии фиксируем прогресс
  }, [training])

  const logView = async (completed) => {
    if (!training) return
    const { time, duration } = stateRef.current
    if (time < 1) return
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/kpi/video?action=view', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ training_id: training.id, watched_seconds: Math.round(time), duration: Math.round(duration), completed })
    })
  }

  if (!training) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(880px, 94vw)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card-hover)', borderRadius: 20, padding: 20, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 6 }}><svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 14px', paddingRight: 30 }}>{training.title}</h3>
        {err ? <p style={{ color: '#dc2626', fontSize: 13 }}>{err}</p>
          : !url ? <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Получаем защищённую ссылку…</p>
          : <VideoPlayer src={url}
              onProgress={(t, d) => { stateRef.current = { time: t, duration: d || stateRef.current.duration } }}
              onEnded={() => logView(true)} />}
      </div>
    </div>
  )
}
