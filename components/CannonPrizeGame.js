import { useState, useRef, useEffect } from 'react'

// Пушка + стеклянные блоки (замена ленты подарков, пункт 2 фидбека от
// 6 сентября 2026). Сервер уже знает результат до всякой анимации (тот
// же принцип честности, что был у ленты — spinTo получает id
// заранее известного приза), клиент только красиво проигрывает путь
// до него. Блок разлетается сеткой 3×3 маленьких осколков — надёжнее и
// не менее эффектно, чем кастомные многоугольники (проверено рендером
// перед тем, как встраивать).
//
// Звук — синтезирован через Web Audio API на лету (шум с затуханием
// для стекла, короткий импульс для выстрела), без внешних аудиофайлов.

function playShatterSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const bufferSize = ctx.sampleRate * 0.35
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2)
    const noise = ctx.createBufferSource(); noise.buffer = buffer
    const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 2200
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
    noise.start()
    // Лёгкий звон поверх шума — стекло, не просто треск.
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(1800, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.25)
    const oscGain = ctx.createGain(); oscGain.gain.setValueAtTime(0.12, ctx.currentTime); oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    osc.connect(oscGain); oscGain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.25)
  } catch (e) { /* Web Audio недоступен — тихо продолжаем без звука, не ломаем игру */ }
}
function playCannonSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.setValueAtTime(180, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15)
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0.4, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.15)
  } catch (e) { /* см. выше */ }
}

const BLOCK_COUNT = 6

function GlassBlock({ shattered, prize, dim }) {
  if (shattered) {
    return (
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        {Array.from({ length: 9 }).map((_, i) => {
          const row = Math.floor(i / 3), col = i % 3
          const dx = (col - 1) * (30 + Math.random() * 40), dy = (row - 1) * (30 + Math.random() * 40) + 20
          const rot = (Math.random() - 0.5) * 260
          return (
            <span key={i} className="glass-shard" style={{
              position: 'absolute', left: col * 21, top: row * 21, width: 21, height: 21,
              background: 'linear-gradient(135deg, rgba(223,240,255,0.6), rgba(122,184,232,0.25))',
              border: '1px solid rgba(191,227,255,0.55)', borderRadius: 3,
              '--dx': `${dx}px`, '--dy': `${dy}px`, '--rot': `${rot}deg`,
            }} />
          )
        })}
        {prize && (
          <div className="prize-pop" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: prize.avatar_url ? 'none' : `linear-gradient(135deg, ${prize.color}, ${prize.color}99)`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 14px ${prize.color}88` }}>
              {prize.avatar_url ? <img src={prize.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M20 7h-3.17A3 3 0 1 0 12 4.5 3 3 0 1 0 7.17 7H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z" /></svg>}
            </div>
          </div>
        )}
      </div>
    )
  }
  return (
    <div style={{ width: 64, height: 64, borderRadius: 12, background: 'linear-gradient(135deg, rgba(223,240,255,0.5), rgba(122,184,232,0.22))', border: '1.5px solid rgba(191,227,255,0.65)', opacity: dim ? 0.35 : 1, transition: 'opacity .3s', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 8, left: 10, width: 18, height: 1, background: 'rgba(255,255,255,0.4)', transform: 'rotate(35deg)' }} />
      <div style={{ position: 'absolute', top: 20, left: 30, width: 14, height: 1, background: 'rgba(255,255,255,0.3)', transform: 'rotate(-20deg)' }} />
    </div>
  )
}

export default function CannonPrizeGame({ prizes, onSpin, spinning, result }) {
  const [targetIndex, setTargetIndex] = useState(null)
  const [ballPos, setBallPos] = useState(null)
  const [shatteredIndex, setShatteredIndex] = useState(null)
  const [showPrize, setShowPrize] = useState(false)
  const [revealedPrize, setRevealedPrize] = useState(null)
  const blocksRef = useRef([])
  const cannonRef = useRef(null)

  const fire = () => {
    if (spinning) return
    setShatteredIndex(null); setShowPrize(false); setRevealedPrize(null); setBallPos(null)
    const idx = Math.floor(Math.random() * BLOCK_COUNT)
    setTargetIndex(idx)
    playCannonSound()
    onSpin((prizeId) => {
      setRevealedPrize(prizes.find(p => p.id === prizeId) || null)
      // Считаем позицию цели относительно пушки в момент выстрела —
      // если блоки/пушка сместились (адаптивная раскладка), полёт
      // всё равно попадёт точно, не в старые координаты.
      requestAnimationFrame(() => {
        const blockEl = blocksRef.current[idx]
        const cannonEl = cannonRef.current
        if (blockEl && cannonEl) {
          const b = blockEl.getBoundingClientRect(), c = cannonEl.getBoundingClientRect()
          setBallPos({ fromX: c.left + c.width / 2, fromY: c.top + c.height / 2, toX: b.left + b.width / 2, toY: b.top + b.height / 2 })
        }
      })
    })
  }

  useEffect(() => {
    if (!ballPos) return
    const t = setTimeout(() => {
      setShatteredIndex(targetIndex)
      playShatterSound()
      setTimeout(() => setShowPrize(true), 260)
    }, 550)
    return () => clearTimeout(t)
  }, [ballPos, targetIndex])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, position: 'relative' }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 260 }}>
        {Array.from({ length: BLOCK_COUNT }).map((_, i) => (
          <div key={i} ref={el => blocksRef.current[i] = el}>
            <GlassBlock shattered={shatteredIndex === i} prize={showPrize && shatteredIndex === i ? revealedPrize : null} dim={spinning && targetIndex !== i && shatteredIndex === null} />
          </div>
        ))}
      </div>

      <div ref={cannonRef} style={{ position: 'relative' }}>
        <svg width="70" height="56" viewBox="0 0 70 56">
          <defs>
            <linearGradient id="cannonMetal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8a94a8" /><stop offset="100%" stopColor="#3d4456" />
            </linearGradient>
          </defs>
          <rect x="10" y="34" width="50" height="16" rx="6" fill="url(#cannonMetal)" />
          <rect x="24" y="6" width="20" height="36" rx="9" fill="url(#cannonMetal)" transform="rotate(-18 34 42)" />
          <circle cx="35" cy="44" r="15" fill="url(#cannonMetal)" />
          <circle cx="35" cy="44" r="7" fill="#1a1f2e" />
        </svg>
      </div>

      {ballPos && (
        <span className="fire-ball" style={{ '--fx': `${ballPos.fromX}px`, '--fy': `${ballPos.fromY}px`, '--tx': `${ballPos.toX}px`, '--ty': `${ballPos.toY}px` }} />
      )}

      <button onClick={fire} disabled={spinning} className="btn-glass" style={{ padding: '11px 30px', fontSize: 13, opacity: spinning ? 0.6 : 1 }}>
        {spinning ? 'Заряжаем…' : 'Выстрелить'}
      </button>

      {result && showPrize && (
        <div style={{ textAlign: 'center', animation: 'prizeReveal .4s ease-out' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 3 }}>Выпало:</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: result.color || 'var(--accent-gold)' }}>{result.label}</div>
        </div>
      )}

      <style jsx global>{`
        .glass-shard { animation: shardFly 0.7s cubic-bezier(0.22,0.8,0.4,1) forwards; }
        @keyframes shardFly { to { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; } }
        .fire-ball {
          position: fixed; left: var(--fx); top: var(--fy); width: 14px; height: 14px; border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #fff8e0, #ea580c 70%); box-shadow: 0 0 10px rgba(234,88,12,0.7);
          z-index: 500; animation: ballFly 0.55s cubic-bezier(0.3,0,0.7,1) forwards; pointer-events: none;
        }
        @keyframes ballFly { to { left: var(--tx); top: var(--ty); transform: scale(0.6); } }
        .prize-pop { animation: prizeReveal 0.35s ease-out; }
        @keyframes prizeReveal { 0% { opacity: 0; transform: scale(0.4); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}
