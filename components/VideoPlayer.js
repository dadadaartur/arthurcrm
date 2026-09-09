import { useEffect, useRef, useState } from 'react'

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]
const fmt = s => { if (!isFinite(s)) return '0:00'; const m = Math.floor(s / 60), ss = Math.floor(s % 60); return `${m}:${String(ss).padStart(2, '0')}` }

export default function VideoPlayer({ src, onProgress, onEnded }) {
  const videoRef = useRef(null)
  const boxRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [vol, setVol] = useState(1)
  const [muted, setMuted] = useState(false)
  const [speedOpen, setSpeedOpen] = useState(false)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onT = () => { setTime(v.currentTime); if (onProgress) onProgress(v.currentTime, v.duration) }
    const onD = () => setDur(v.duration || 0)
    const onP = () => setPlaying(!v.paused)
    const onE = () => { setPlaying(false); if (onEnded) onEnded() }
    v.addEventListener('timeupdate', onT); v.addEventListener('loadedmetadata', onD)
    v.addEventListener('play', onP); v.addEventListener('pause', onP); v.addEventListener('ended', onE)
    return () => { v.removeEventListener('timeupdate', onT); v.removeEventListener('loadedmetadata', onD); v.removeEventListener('play', onP); v.removeEventListener('pause', onP); v.removeEventListener('ended', onE) }
  }, [src])

  const toggle = () => { const v = videoRef.current; if (!v) return; v.paused ? v.play() : v.pause() }
  const seek = e => { const v = videoRef.current; if (!v || !dur) return; v.currentTime = (e.target.value / 100) * dur }
  const setSpd = s => { setSpeed(s); if (videoRef.current) videoRef.current.playbackRate = s; setSpeedOpen(false) }
  const full = () => { const b = boxRef.current; if (!b) return; document.fullscreenElement ? document.exitFullscreen() : b.requestFullscreen() }

  return (
    <div ref={boxRef} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', border: '1px solid rgba(255,215,0,0.25)', boxShadow: '0 0 40px rgba(255,215,0,0.15)' }} onContextMenu={e => e.preventDefault()}>
      <video ref={videoRef} src={src} style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'contain', cursor: 'pointer' }} onClick={toggle} playsInline />
      {!playing && (
        <div onClick={toggle} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.25)' }}>
          <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,215,0,0.9), rgba(255,180,0,0.8))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(255,215,0,0.6)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#0a0f1e"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '20px 14px 10px', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.85))', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input type="range" min="0" max="100" value={dur ? (time / dur) * 100 : 0} onChange={seek} style={{ width: '100%', accentColor: '#FFD700', cursor: 'pointer', height: 4 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FFD700', display: 'flex', padding: 2 }}>
            {playing
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
          </button>
          <span style={{ fontSize: 11, color: '#ddd', fontVariantNumeric: 'tabular-nums' }}>{fmt(time)} / {fmt(dur)}</span>
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <button onClick={() => setSpeedOpen(o => !o)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 8, color: '#FFD700', fontSize: 11, padding: '3px 8px', cursor: 'pointer' }}>{speed}×</button>
            {speedOpen && (
              <div style={{ position: 'absolute', bottom: 26, right: 0, background: 'rgba(10,14,28,0.95)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 10, overflow: 'hidden', zIndex: 5 }}>
                {SPEEDS.map(s => (
                  <button key={s} onClick={() => setSpd(s)} style={{ display: 'block', width: '100%', padding: '6px 12px', background: s === speed ? 'rgba(255,215,0,0.15)' : 'none', border: 'none', color: s === speed ? '#FFD700' : '#ccc', fontSize: 11, cursor: 'pointer', textAlign: 'left' }}>{s}×</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setMuted(m => { const nm = !m; if (videoRef.current) videoRef.current.muted = nm; return nm })} style={{ background: 'none', border: 'none', color: '#ddd', cursor: 'pointer', display: 'flex', padding: 2 }}>
            {muted || vol === 0
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" opacity="0.5"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3l3-3-1.5-1.5-3 3-3-3L10.5 9l3 3-3 3L12 16.5l3-3 3 3L19.5 18l-3-3z" /></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12z" /></svg>}
          </button>
          <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : vol} onChange={e => { const v = +e.target.value; setVol(v); setMuted(v === 0); if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0 } }} style={{ width: 60, accentColor: '#FFD700', cursor: 'pointer' }} />
          <button onClick={full} style={{ background: 'none', border: 'none', color: '#ddd', cursor: 'pointer', display: 'flex', padding: 2 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
