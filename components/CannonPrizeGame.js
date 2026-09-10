import { useState, useRef, useEffect, useMemo } from 'react'

// Космическая лента призов — полная замена пушки (по прямому фидбеку
// от 6 сентября 2026: пушка «не держится вместе» как механика, хотя
// сами шары и фон были хороши). Сцена со звёздами и вспышкой
// сверхновой нарисована и проверена рендером ДО кода — тот же приём,
// что уже спасал раньше, не полагаюсь на то, что «получится».
//
// Механика — та же, что мысленно уже знакома по прежней ленте:
// горизонтальная полоса едет, замедляется, останавливается на призе.
// Здесь вместо цветных секторов — летящие звёзды, а вместо стрелки —
// звезда-цель взрывается сверхновой. Честность та же: сервер уже
// знает результат до начала анимации, лента лишь заранее знает, на
// каком по счёту элементе нужно остановиться, чтобы прийти именно к
// нему — подделать нельзя, спрятать от игрока нечего.

const STAR_COLORS = [
  { core: '#a8d8ff', glow: '#3a7bd5' }, { core: '#ffb8e6', glow: '#c589f5' },
  { core: '#ffe8b8', glow: '#ea580c' }, { core: '#b8ffdb', glow: '#22d3ee' },
  { core: '#e8c8ff', glow: '#7c3aed' },
]
const STRIP_LENGTH = 36
const STAR_SPACING = 96

function playWhoosh(duration) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5
    const noise = ctx.createBufferSource(); noise.buffer = buffer
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'
    filter.frequency.setValueAtTime(2400, ctx.currentTime); filter.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + duration)
    filter.Q.value = 0.8
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0.28, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + duration * 0.85); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination); noise.start()
  } catch (e) { /* Web Audio недоступен — тихо продолжаем без звука */ }
}
function playNovaBoom() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(110, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.5)
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.6)
    const bufferSize = ctx.sampleRate * 0.3
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5)
    const noise = ctx.createBufferSource(); noise.buffer = buffer
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.3, ctx.currentTime); ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    noise.connect(ng); ng.connect(ctx.destination); noise.start()
    ;[523, 784, 1047, 1568].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f
      const g = ctx.createGain(); g.gain.setValueAtTime(0, ctx.currentTime + 0.15 + i * 0.06)
      g.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 0.18 + i * 0.06); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7 + i * 0.06)
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + 0.15 + i * 0.06); o.stop(ctx.currentTime + 0.75 + i * 0.06)
    })
  } catch (e) { /* см. выше */ }
}

function Star({ size, colorIdx, big }) {
  const c = STAR_COLORS[colorIdx % STAR_COLORS.length]
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
      <defs>
        <radialGradient id={`starG${colorIdx}${size}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" /><stop offset="35%" stopColor={c.core} /><stop offset="100%" stopColor={c.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill={`url(#starG${colorIdx}${size})`} />
      <circle cx="50" cy="50" r={big ? 11 : 7} fill="#fff" />
      <path d={`M50 ${big ? 12 : 22} L50 ${big ? 88 : 78} M${big ? 12 : 22} 50 L${big ? 88 : 78} 50`} stroke={c.core} strokeWidth={big ? 1.6 : 1} opacity="0.55" />
    </svg>
  )
}

function NovaBurst({ size = 220 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
      <defs>
        <radialGradient id="novaG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" /><stop offset="20%" stopColor="#ffe8b8" /><stop offset="45%" stopColor="#ff8a5c" /><stop offset="70%" stopColor="#c589f5" stopOpacity="0.5" /><stop offset="100%" stopColor="#3a1f6b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="110" cy="110" r="95" fill="url(#novaG)" className="nova-scale" />
      <path d="M110 15 L119 92 L110 205 L101 92 Z" fill="#fff" opacity="0.85" className="nova-scale" />
      <path d="M15 110 L92 101 L205 110 L92 119 Z" fill="#fff" opacity="0.65" className="nova-scale" />
      <path d="M45 45 L102 98 L175 175 L98 102 Z" fill="#ffd9a8" opacity="0.5" className="nova-scale" />
      <circle cx="110" cy="110" r="18" fill="#fff" className="nova-scale" />
    </svg>
  )
}

export default function CannonPrizeGame({ prizes, onSpin, spinning, result }) {
  const [phase, setPhase] = useState('idle') // idle | spinning | exploding | revealed
  const [offset, setOffset] = useState(0)
  const [winIndex] = useState(() => 20 + Math.floor(Math.random() * 8))
  const [strip, setStrip] = useState(() => Array.from({ length: STRIP_LENGTH }).map(() => ({ colorIdx: Math.floor(Math.random() * STAR_COLORS.length), size: 46 + Math.random() * 18 })))
  const [revealedPrize, setRevealedPrize] = useState(null)
  const pendingPrizeId = useRef(null)
  const trackRef = useRef(null)

  const fire = () => {
    if (spinning || phase !== 'idle') return
    setPhase('spinning')
    setRevealedPrize(null)
    pendingPrizeId.current = null
    onSpin((prizeId) => { pendingPrizeId.current = prizeId })
    playWhoosh(3.4)
    // Смещаем полосу так, чтобы winIndex-я звезда точно легла в центр окна.
    requestAnimationFrame(() => {
      const trackEl = trackRef.current
      const windowWidth = trackEl?.parentElement?.offsetWidth || 380
      const target = winIndex * STAR_SPACING + STAR_SPACING / 2 - windowWidth / 2
      setOffset(target)
    })
  }

  useEffect(() => {
    if (phase !== 'spinning') return
    const t = setTimeout(() => {
      setPhase('exploding')
      playNovaBoom()
      setTimeout(() => {
        setRevealedPrize(prizes.find(p => p.id === pendingPrizeId.current) || null)
        setPhase('revealed')
      }, 420)
    }, 3400)
    return () => clearTimeout(t)
  }, [phase, prizes])

  const reset = () => {
    setPhase('idle'); setOffset(0); setRevealedPrize(null)
    setStrip(Array.from({ length: STRIP_LENGTH }).map(() => ({ colorIdx: Math.floor(Math.random() * STAR_COLORS.length), size: 46 + Math.random() * 18 })))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, height: 150, borderRadius: 20, overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 30%, #241855, #08060f 75%)', border: '1px solid rgba(124,58,237,0.35)', boxShadow: '0 0 40px rgba(124,58,237,0.15) inset' }}>
        <div className="nova-bg-stars" />
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.5), transparent)', zIndex: 5, transform: 'translateX(-1px)' }} />
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 116, height: 116, marginLeft: -58, marginTop: -58, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.25)', zIndex: 4, pointerEvents: 'none' }} />

        {phase !== 'exploding' && phase !== 'revealed' && (
          <div ref={trackRef} style={{ position: 'absolute', top: '50%', left: 0, display: 'flex', alignItems: 'center', height: STAR_SPACING, transform: `translate(${-offset}px, -50%)`, transition: phase === 'spinning' ? 'transform 3.4s cubic-bezier(0.09,0.7,0.15,1)' : 'none' }}>
            {strip.map((s, i) => (
              <div key={i} style={{ width: STAR_SPACING, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Star size={i === winIndex ? 60 : s.size} colorIdx={i === winIndex ? (revealedPrize ? 0 : s.colorIdx) : s.colorIdx} big={i === winIndex} />
              </div>
            ))}
          </div>
        )}

        {(phase === 'exploding' || phase === 'revealed') && (
          <>
            <NovaBurst size={phase === 'exploding' ? 260 : 200} />
            {phase === 'revealed' && revealedPrize && (
              <div className="prize-emerge" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: revealedPrize.avatar_url ? 'none' : `linear-gradient(135deg, ${revealedPrize.color}, ${revealedPrize.color}bb)`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 34px ${revealedPrize.color}, 0 0 70px ${revealedPrize.color}77` }}>
                  {revealedPrize.avatar_url ? <img src={revealedPrize.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M20 7h-3.17A3 3 0 1 0 12 4.5 3 3 0 1 0 7.17 7H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z" /></svg>}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {phase === 'revealed' && result ? (
        <div style={{ textAlign: 'center' }}>
          <div className="wow-text" style={{ fontSize: 17, fontWeight: 800, color: result.color || 'var(--accent-gold)' }}>{result.label}</div>
          <button onClick={reset} className="btn-glass" style={{ padding: '9px 24px', fontSize: 12.5, marginTop: 10 }}>Ещё раз</button>
        </div>
      ) : (
        <button onClick={fire} disabled={spinning || phase !== 'idle'} className="btn-glass" style={{ padding: '11px 30px', fontSize: 13, opacity: (spinning || phase !== 'idle') ? 0.6 : 1 }}>
          {phase === 'spinning' ? 'Летим…' : phase === 'exploding' ? 'Ждите…' : 'Запустить'}
        </button>
      )}

      <style jsx global>{`
        .nova-bg-stars {
          position: absolute; inset: 0;
          background-image: radial-gradient(1px 1px at 15% 20%, rgba(255,255,255,0.5), transparent), radial-gradient(1px 1px at 40% 70%, rgba(255,255,255,0.4), transparent), radial-gradient(1.5px 1.5px at 65% 30%, rgba(255,255,255,0.5), transparent), radial-gradient(1px 1px at 85% 65%, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 25% 85%, rgba(255,255,255,0.3), transparent), radial-gradient(1.5px 1.5px at 92% 15%, rgba(255,255,255,0.5), transparent);
          opacity: 0.8; z-index: 1;
        }
        .nova-scale { animation: novaGrow 0.5s cubic-bezier(0.22,0.9,0.35,1) forwards; transform-origin: 110px 110px; }
        @keyframes novaGrow { 0% { transform: scale(0.15); opacity: 0; } 55% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 0.9; } }
        .prize-emerge { animation: prizeEmerge 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.15s both; }
        @keyframes prizeEmerge { 0% { opacity: 0; transform: translate(-50%,-50%) scale(0.2); } 100% { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
        .wow-text { animation: wowTextIn 0.5s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes wowTextIn { 0% { opacity: 0; transform: scale(0.5) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  )
}
