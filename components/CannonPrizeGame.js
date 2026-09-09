import { useState, useRef, useEffect, useCallback } from 'react'

// Пушка со стеклянными шарами — глубокая переработка (по прямому
// фидбеку от 6 сентября 2026: первая версия «примитивна, как обучение
// кодингу в детском саду»). Голографические шары и сама пушка
// нарисованы и проверены рендером ДО того, как встраивать в код — не
// повторяю ошибку прошлого раза, когда форма осколков не читалась
// визуально и я узнал об этом только от вас.
//
// Прицеливание настоящее: несколько шаров медленно дрейфуют по
// площадке, игрок кликает по конкретному шару — пушка поворачивается
// именно на него, шарик летит именно туда. При этом какой именно приз
// выпадет — уже решено сервером ДО выстрела (та же принципиальная
// честность, что была у ленты: спрятать распределение от клиента
// нельзя, иначе можно подделать результат) — прицеливание влияет на
// то, что красиво происходит, не на то, что выпадает. Это стандартный,
// честный приём для подобных механик — интерес в самом действии, не в
// иллюзии, что меткость меняет шансы.

function playShatterSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const bufferSize = ctx.sampleRate * 0.4
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.8)
    const noise = ctx.createBufferSource(); noise.buffer = buffer
    const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 2000
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0.55, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination); noise.start()
    ;[1600, 2200, 2900].forEach((f, i) => {
      const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(f, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(f * 0.4, ctx.currentTime + 0.3)
      const g = ctx.createGain(); g.gain.setValueAtTime(0.09, ctx.currentTime + i * 0.02); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.connect(g); g.connect(ctx.destination); osc.start(ctx.currentTime + i * 0.02); osc.stop(ctx.currentTime + 0.32)
    })
  } catch (e) { /* Web Audio недоступен — тихо продолжаем без звука */ }
}
function playCannonSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.setValueAtTime(190, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.18)
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0.45, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.18)
  } catch (e) { /* см. выше */ }
}
function playWowSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[523, 659, 784, 1047].forEach((f, i) => {
      const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f
      const g = ctx.createGain(); g.gain.setValueAtTime(0, ctx.currentTime + i * 0.07)
      g.gain.linearRampToValueAtTime(0.13, ctx.currentTime + i * 0.07 + 0.03)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.5)
      osc.connect(g); g.connect(ctx.destination); osc.start(ctx.currentTime + i * 0.07); osc.stop(ctx.currentTime + i * 0.07 + 0.5)
    })
  } catch (e) { /* см. выше */ }
}

const ORB_COUNT = 5
const HOLO_RIMS = ['#ffb3ec,#b3d9ff', '#b3fff0,#e0b3ff', '#ffd9a8,#b3d9ff', '#c2ffb3,#ffb3d9', '#b3e0ff,#f5c2ff']

function HoloOrb({ size, rimPair, popped, prize, style, onClick }) {
  const [c1, c2] = rimPair.split(',')
  if (popped) {
    return (
      <div style={{ ...style, width: size, height: size, position: 'absolute' }}>
        {Array.from({ length: 10 }).map((_, i) => {
          const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.4
          const dist = 55 + Math.random() * 55
          const dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist - 20
          const rot = (Math.random() - 0.5) * 400
          return (
            <span key={i} className="orb-shard" style={{
              position: 'absolute', left: '50%', top: '50%', width: 10 + Math.random() * 8, height: 10 + Math.random() * 8,
              background: `linear-gradient(135deg, ${c1}99, ${c2}55)`, border: `1px solid ${c1}`, borderRadius: '30%',
              '--dx': `${dx}px`, '--dy': `${dy}px`, '--rot': `${rot}deg`,
            }} />
          )
        })}
        <span className="orb-flash" style={{ position: 'absolute', left: '50%', top: '50%', width: 4, height: 4 }} />
        {prize && (
          <div className="prize-wow" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: prize.avatar_url ? 'none' : `linear-gradient(135deg, ${prize.color}, ${prize.color}bb)`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 30px ${prize.color}, 0 0 60px ${prize.color}66` }}>
              {prize.avatar_url ? <img src={prize.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M20 7h-3.17A3 3 0 1 0 12 4.5 3 3 0 1 0 7.17 7H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z" /></svg>}
            </div>
          </div>
        )}
      </div>
    )
  }
  return (
    <div onClick={onClick} style={{ ...style, width: size, height: size, position: 'absolute', cursor: 'pointer', borderRadius: '50%' }} className="holo-orb">
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.35))' }}>
        <defs>
          <radialGradient id={`holoFill${size}${c1}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.95" /><stop offset="30%" stopColor={c1} stopOpacity="0.5" />
            <stop offset="65%" stopColor={c2} stopOpacity="0.38" /><stop offset="100%" stopColor={c1} stopOpacity="0.3" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="46" fill={`url(#holoFill${size}${c1})`} stroke={c1} strokeWidth="2" />
        <ellipse cx="36" cy="32" rx="14" ry="9" fill="#fff" opacity="0.75" transform="rotate(-25 36 32)" />
        <circle cx="62" cy="65" r="3.5" fill="#fff" opacity="0.5" />
      </svg>
    </div>
  )
}

export default function CannonPrizeGame({ prizes, onSpin, spinning, result }) {
  const [orbs, setOrbs] = useState(() => Array.from({ length: ORB_COUNT }).map((_, i) => ({
    id: i, size: 60 + Math.random() * 34, rim: HOLO_RIMS[i % HOLO_RIMS.length],
    left: 10 + (i * 78) / ORB_COUNT + Math.random() * 8, top: 8 + Math.random() * 18,
    duration: 6 + Math.random() * 5, delay: Math.random() * -6,
  })))
  const [poppedId, setPoppedId] = useState(null)
  const [showPrize, setShowPrize] = useState(false)
  const [revealedPrize, setRevealedPrize] = useState(null)
  const [ballPos, setBallPos] = useState(null)
  const [cannonAngle, setCannonAngle] = useState(0)
  const [wowActive, setWowActive] = useState(false)
  const areaRef = useRef(null)
  const cannonRef = useRef(null)
  const orbRefs = useRef({})
  const pendingPrizeId = useRef(null)

  const fireAt = useCallback((orb) => {
    if (spinning || poppedId != null) return
    const orbEl = orbRefs.current[orb.id]
    const cannonEl = cannonRef.current
    if (!orbEl || !cannonEl) return
    const o = orbEl.getBoundingClientRect(), c = cannonEl.getBoundingClientRect()
    const fromX = c.left + c.width / 2, fromY = c.top + c.height * 0.25
    const toX = o.left + o.width / 2, toY = o.top + o.height / 2
    const angle = Math.atan2(toY - fromY, toX - fromX) * (180 / Math.PI) + 90
    setCannonAngle(angle)
    playCannonSound()
    pendingPrizeId.current = null
    onSpin((prizeId) => { pendingPrizeId.current = prizeId })
    setTimeout(() => {
      setBallPos({ fromX, fromY, toX, toY, orbId: orb.id })
    }, 120)
  }, [spinning, poppedId, onSpin])

  useEffect(() => {
    if (!ballPos) return
    const t = setTimeout(() => {
      setPoppedId(ballPos.orbId)
      playShatterSound()
      setTimeout(() => {
        setRevealedPrize(prizes.find(p => p.id === pendingPrizeId.current) || null)
        setShowPrize(true)
        setWowActive(true)
        playWowSound()
      }, 240)
    }, 480)
    return () => clearTimeout(t)
  }, [ballPos, prizes])

  const reset = () => {
    setPoppedId(null); setShowPrize(false); setRevealedPrize(null); setBallPos(null); setWowActive(false)
    setOrbs(prev => prev.map(o => ({ ...o, left: 10 + Math.random() * 70, top: 8 + Math.random() * 22 })))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', margin: 0, textAlign: 'center' }}>Кликните по любому шару, чтобы прицелиться и выстрелить</p>
      <div ref={areaRef} style={{ position: 'relative', width: '100%', maxWidth: 420, height: 200, borderRadius: 20, background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.1), rgba(20,23,40,0.5))', overflow: 'hidden', border: '1px solid rgba(124,58,237,0.2)' }}>
        {orbs.map(orb => (
          <div key={orb.id} ref={el => orbRefs.current[orb.id] = el}
            className={poppedId === null ? 'orb-drift' : ''}
            style={{ left: `${orb.left}%`, top: `${orb.top}%`, animationDuration: `${orb.duration}s`, animationDelay: `${orb.delay}s`, position: 'absolute' }}>
            <HoloOrb size={orb.size} rimPair={orb.rim} popped={poppedId === orb.id} prize={showPrize && poppedId === orb.id ? revealedPrize : null}
              onClick={() => fireAt(orb)} style={{}} />
          </div>
        ))}
      </div>

      <div ref={cannonRef} style={{ position: 'relative', marginTop: -4 }}>
        <svg width="130" height="110" viewBox="0 0 260 220">
          <defs>
            <linearGradient id="cGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff3c4" /><stop offset="45%" stopColor="#e8a94a" /><stop offset="100%" stopColor="#8a5a12" /></linearGradient>
            <linearGradient id="cPurple" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c589f5" /><stop offset="100%" stopColor="#6b21a8" /></linearGradient>
            <radialGradient id="cBarrelInner" cx="50%" cy="35%" r="65%"><stop offset="0%" stopColor="#4a3570" /><stop offset="100%" stopColor="#1a0f2e" /></radialGradient>
          </defs>
          <ellipse cx="130" cy="185" rx="70" ry="14" fill="#000" opacity="0.35" />
          <path d="M55 150 Q60 195 130 195 Q200 195 205 150 L195 165 Q190 180 130 180 Q70 180 65 165 Z" fill="url(#cGold)" stroke="#6b4a10" strokeWidth="1.5" />
          <ellipse cx="130" cy="150" rx="75" ry="20" fill="url(#cGold)" stroke="#6b4a10" strokeWidth="1.5" />
          <circle cx="130" cy="140" r="30" fill="url(#cGold)" stroke="#6b4a10" strokeWidth="1.5" />
          <circle cx="130" cy="140" r="13" fill="url(#cPurple)" opacity="0.9" />
          <circle cx="125" cy="135" r="4" fill="#fff" opacity="0.6" />
          <g style={{ transform: `rotate(${cannonAngle}deg)`, transformOrigin: '130px 140px', transition: 'transform 0.35s cubic-bezier(0.34,1.4,0.4,1)' }}>
            <rect x="105" y="30" width="50" height="115" rx="22" fill="url(#cPurple)" stroke="#4a1a70" strokeWidth="1.5" />
            <rect x="112" y="38" width="12" height="90" rx="6" fill="#fff" opacity="0.2" />
            <ellipse cx="130" cy="35" rx="26" ry="10" fill="url(#cBarrelInner)" />
            <ellipse cx="130" cy="35" rx="26" ry="10" fill="none" stroke="url(#cGold)" strokeWidth="3" />
            <circle cx="130" cy="70" r="18" fill="none" stroke="url(#cGold)" strokeWidth="3" opacity="0.8" />
          </g>
        </svg>
      </div>

      {ballPos && (
        <span key={ballPos.orbId + '-' + ballPos.toX} className="fire-ball" style={{ '--fx': `${ballPos.fromX}px`, '--fy': `${ballPos.fromY}px`, '--tx': `${ballPos.toX}px`, '--ty': `${ballPos.toY}px` }} />
      )}

      {showPrize && result ? (
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <div className={wowActive ? 'wow-text' : ''} style={{ fontSize: 17, fontWeight: 800, color: result.color || 'var(--accent-gold)' }}>{result.label}</div>
          <button onClick={reset} className="btn-glass" style={{ padding: '9px 24px', fontSize: 12.5, marginTop: 10 }}>Ещё раз</button>
        </div>
      ) : (
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, minHeight: 20 }}>{spinning || ballPos ? 'Летит…' : 'Выберите цель'}</div>
      )}

      <style jsx global>{`
        .orb-drift { animation-name: orbDrift; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        @keyframes orbDrift { 0%,100% { transform: translate(0,0); } 25% { transform: translate(14px,-10px); } 50% { transform: translate(-8px,8px); } 75% { transform: translate(10px,12px); } }
        .holo-orb { transition: transform 0.15s ease; }
        .holo-orb:hover { transform: scale(1.08); }
        .orb-shard { animation: orbShardFly 0.85s cubic-bezier(0.22,0.8,0.4,1) forwards; }
        @keyframes orbShardFly { to { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; } }
        .orb-flash { border-radius: 50%; background: #fff; box-shadow: 0 0 40px 20px rgba(255,255,255,0.9); animation: flashPulse 0.35s ease-out forwards; }
        @keyframes flashPulse { 0% { opacity: 1; transform: scale(0.3); } 100% { opacity: 0; transform: scale(3.5); } }
        .prize-wow { animation: wowPop 0.55s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes wowPop { 0% { opacity: 0; transform: translate(-50%,-50%) scale(0.2) rotate(-25deg); } 60% { transform: translate(-50%,-50%) scale(1.25) rotate(8deg); } 100% { opacity: 1; transform: translate(-50%,-50%) scale(1) rotate(0); } }
        .wow-text { animation: wowTextIn 0.5s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes wowTextIn { 0% { opacity: 0; transform: scale(0.5) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        .fire-ball {
          position: fixed; left: var(--fx); top: var(--fy); width: 16px; height: 16px; border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #fff8e0, #ea580c 70%); box-shadow: 0 0 14px rgba(234,88,12,0.8), 0 0 4px #fff;
          z-index: 500; animation: ballFly2 0.48s cubic-bezier(0.3,0,0.7,1) forwards; pointer-events: none;
        }
        @keyframes ballFly2 { to { left: var(--tx); top: var(--ty); transform: scale(0.5); } }
      `}</style>
    </div>
  )
}
