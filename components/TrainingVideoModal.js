import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import VideoPlayer from './VideoPlayer'

export default function TrainingVideoModal({ training, onClose }) {
  const [url, setUrl] = useState(null)
  const [err, setErr] = useState('')
  const [progress, setProgress] = useState(0)
  const [dur, setDur] = useState(0)

  useEffect(() => {
    if (!training) return
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(`/api/kpi/video?action=sign&id=${training.id}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      const d = await r.json()
      if (r.ok) setUrl(d.url); else setErr(d.error || 'Не удалось получить видео')
    }
    load()
  }, [training])

  const logView = async (completed) => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/kpi/video?action=view', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ training_id: training.id, watched_seconds: Math.round(progress), completed }) })
  }

  if (!training) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(880px, 94vw)', background: 'linear-gradient(150deg, rgba(24,30,54,0.97), rgba(10,14,28,0.98))', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 20, padding: 20, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#888', cursor: 'pointer', zIndex: 6 }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: '0 0 14px', paddingRight: 30 }}>{training.title}</h3>
        {err ? <p style={{ color: '#f87171', fontSize: 13 }}>{err}</p>
          : !url ? <p style={{ color: '#888', fontSize: 13 }}>Получаем защищённую ссылку…</p>
          : <VideoPlayer src={url} onProgress={t => { setProgress(t) }} onEnded={() => logView(true)} />}
      </div>
    </div>
  )
}
