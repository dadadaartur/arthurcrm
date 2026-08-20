import { useMemo } from 'react'

function FlyingComet({ left, top, angle, dist, dur, delay, scale = 0.55 }) {
  return (
    <div style={{ position: 'absolute', left, top, zIndex: 1, pointerEvents: 'none', transform: `rotate(${angle}deg)`, '--dist': dist + 'px', filter: 'blur(0.6px)' }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0', position: 'relative', width: 0, height: 0 }}>
        <div style={{ position: 'absolute', left: 0, top: -2, height: 4, width: dist, transformOrigin: '0 50%', borderRadius: 4, opacity: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(170,195,255,0.08) 40%, rgba(205,225,255,0.16) 80%, rgba(235,245,255,0.22) 100%)', animation: `bgCometSmoke ${dur}s linear ${delay}s infinite` }} />
        <div style={{ position: 'absolute', left: 0, top: 0, opacity: 0, animation: `bgCometFly ${dur}s linear ${delay}s infinite` }}>
          <div style={{ position: 'absolute', left: -140, top: -1, width: 140, height: 2, background: 'linear-gradient(90deg, transparent 0%, rgba(180,210,255,0.25) 55%, rgba(225,240,255,0.7) 88%, rgba(255,255,255,0.95) 100%)', borderRadius: 2, filter: 'blur(0.8px)' }} />
          <div style={{ position: 'absolute', left: -3, top: -3, width: 6, height: 6, borderRadius: '50%', background: 'radial-gradient(circle, #fff 0%, rgba(225,240,255,0.9) 45%, transparent 100%)', boxShadow: '0 0 8px rgba(255,255,255,0.95), 0 0 18px rgba(170,210,255,0.6), 0 0 30px rgba(140,190,255,0.35)' }} />
        </div>
      </div>
    </div>
  )
}

export default function Background() {
  const stars = useMemo(() => {
    const arr = []
    const colors = ['#ffffff', '#ffe0d0', '#ffddaa', '#d0e0ff', '#ffffdd', '#ffe4c4']
    for (let i = 0; i < 160; i++) {
      arr.push({ left: Math.random() * 100, top: Math.random() * 100, size: Math.random() * 2.2 + 0.5, color: colors[Math.floor(Math.random() * colors.length)], op: Math.random() * 0.5 + 0.3, dur: Math.random() * 18 + 10, delay: Math.random() * 14 })
    }
    return arr
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: '#000', overflow: 'hidden', pointerEvents: 'none' }}>
      {stars.map((s, i) => (
        <div key={i} style={{ position: 'absolute', left: s.left + '%', top: s.top + '%', width: s.size, height: s.size, borderRadius: '50%', background: s.color, boxShadow: `0 0 ${s.size * 2}px ${s.color}`, opacity: s.op, animation: `bgTwinkle ${s.dur}s ease-in-out infinite`, animationDelay: s.delay + 's' }} />
      ))}
      <div style={{ position: 'absolute', top: '18%', left: '-4%', width: '38%', height: '38%', background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.07) 0%, transparent 70%)', filter: 'blur(55px)', animation: 'bgNebula1 220s ease-in-out infinite alternate' }} />
      <div style={{ position: 'absolute', bottom: '18%', right: '-4%', width: '44%', height: '44%', background: 'radial-gradient(ellipse at center, rgba(255,150,200,0.05) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'bgNebula2 260s ease-in-out infinite alternate' }} />
      <FlyingComet left="8%" top="22%" angle={-16} dist={560} dur={70} delay={6} scale={0.55} />
      <FlyingComet left="70%" top="10%" angle={158} dist={600} dur={80} delay={45} scale={0.45} />
      <FlyingComet left="12%" top="70%" angle={-30} dist={520} dur={75} delay={90} scale={0.5} />
      <FlyingComet left="85%" top="55%" angle={200} dist={560} dur={85} delay={130} scale={0.42} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 100%, rgba(255,100,50,0.14) 0%, rgba(255,100,50,0.06) 40%, transparent 75%)', filter: 'blur(18px)', animation: 'bgBreathe1 40s ease-in-out infinite alternate' }} />
        <div style={{ position: 'absolute', bottom: 0, right: '-8%', width: '115%', height: '100%', background: 'radial-gradient(ellipse at 72% 100%, rgba(130,100,255,0.1) 0%, transparent 70%)', filter: 'blur(24px)', animation: 'bgBreathe2 56s ease-in-out infinite alternate' }} />
      </div>
      <style jsx global>{`
        @keyframes bgTwinkle { 0%, 100% { opacity: 0.2; transform: scale(0.95); } 50% { opacity: 0.9; transform: scale(1.05); } }
        @keyframes bgNebula1 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(6%,3%) scale(1.05); } }
        @keyframes bgNebula2 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-5%,-4%) scale(1.07); } }
        @keyframes bgBreathe1 { 0% { opacity: 0.6; transform: scaleY(1); } 100% { opacity: 1; transform: scaleY(1.08); } }
        @keyframes bgBreathe2 { 0% { opacity: 0.4; transform: scaleY(1.05) translateX(1%); } 100% { opacity: 0.8; transform: scaleY(1.15) translateX(-1%); } }
        @keyframes bgCometFly { 0% { transform: translateX(0); opacity: 0; } 2% { opacity: 0.85; } 12% { transform: translateX(var(--dist)); opacity: 0; } 100% { transform: translateX(var(--dist)); opacity: 0; } }
        @keyframes bgCometSmoke { 0% { transform: scaleX(0) scaleY(1); opacity: 0; filter: blur(3px); } 2% { opacity: 0.25; } 12% { transform: scaleX(1) scaleY(1); opacity: 0.22; filter: blur(4px); } 45% { transform: scaleX(1) scaleY(2); opacity: 0.16; filter: blur(6px); } 75% { transform: scaleX(1) scaleY(3); opacity: 0.08; filter: blur(8px); } 95% { transform: scaleX(1) scaleY(3.6); opacity: 0; filter: blur(10px); } 100% { transform: scaleX(1) scaleY(3.6); opacity: 0; filter: blur(10px); } }
      `}</style>
    </div>
  )
}
