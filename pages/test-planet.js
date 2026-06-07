import Head from 'next/head'

export default function TestPlanetPage() {
  const centerX = 50
  const centerY = 42

  const blocks = [
    { title: 'Чемпионат', sub: 'менеджеров', left: 28, top: 10, colors: ['#7AC78F', '#c084fc'] },
    { title: 'Гороскоп', sub: 'профессий', left: 70, top: 14, colors: ['#c084fc', '#F28B82'] },
    { title: 'Журнал ПРО', sub: 'лучшие практики', left: 18, top: 38, colors: ['#c084fc', '#7AC78F'] },
    { title: 'Квиз', sub: 'проверь себя', left: 75, top: 40, colors: ['#7AC78F', '#F28B82'] },
    { title: 'ИИ‑питомец', sub: 'учи и развивай', left: 42, top: 62, colors: ['#A3E0B0', '#d4af37'] },
    { title: 'Битва', sub: 'отделов', left: 60, top: 72, colors: ['#d4af37', '#A3E0B0'] }
  ]

  // 12 усиков пыли с разными углами
  const wisps = [
    { angle: 10, length: 16 },
    { angle: 40, length: 20 },
    { angle: 75, length: 14 },
    { angle: 110, length: 22 },
    { angle: 145, length: 18 },
    { angle: 180, length: 15 },
    { angle: 215, length: 21 },
    { angle: 250, length: 17 },
    { angle: 285, length: 19 },
    { angle: 320, length: 13 },
    { angle: 350, length: 20 },
    { angle: 15, length: 23 }
  ]

  return (
    <>
      <Head>
        <title>Вид с МКС | Кармический банк</title>
      </Head>

      <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
        {/* Звёзды */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
          {Array.from({ length: 150 }).map((_, i) => {
            const size = Math.random() * 2.8 + 0.6
            const colors = ['#ffffff', '#ffe0d0', '#ffddaa', '#d0e0ff', '#ffffdd', '#ffe4c4']
            const color = colors[Math.floor(Math.random() * colors.length)]
            return (
              <div key={i} style={{
                position: 'absolute', left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
                width: size + 'px', height: size + 'px', borderRadius: '50%', background: color,
                boxShadow: `0 0 ${size * 2}px ${color}`,
                opacity: Math.random() * 0.5 + 0.3,
                animation: `twinkle ${Math.random() * 10 + 5}s ease-in-out infinite`,
                animationDelay: Math.random() * 10 + 's'
              }} />
            )
          })}
        </div>

        {/* Космическое свечение */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%',
          background: 'radial-gradient(ellipse at 50% 100%, rgba(255,100,50,0.5) 0%, rgba(255,100,50,0.2) 40%, transparent 75%)',
          animation: 'breathe1 12s ease-in-out infinite alternate', zIndex: 1
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: '-10%', width: '120%', height: '100%',
          background: 'radial-gradient(ellipse at 30% 100%, rgba(255,100,150,0.4) 0%, transparent 70%)',
          filter: 'blur(8px)', animation: 'breathe2 16s ease-in-out infinite alternate', zIndex: 2
        }} />
        <div style={{
          position: 'absolute', bottom: 0, right: '-10%', width: '120%', height: '100%',
          background: 'radial-gradient(ellipse at 70% 100%, rgba(130,100,255,0.4) 0%, transparent 70%)',
          filter: 'blur(10px)', animation: 'breathe3 20s ease-in-out infinite alternate', zIndex: 2
        }} />

        {/* Облако космической пыли (три слоя) */}
        <div style={{
          position: 'absolute',
          left: `${centerX}%`,
          top: `${centerY}%`,
          transform: 'translate(-50%, -50%)',
          width: '80px',
          height: '80px',
          zIndex: 5
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            background: 'radial-gradient(circle at 45% 45%, rgba(255,215,0,0.6) 0%, rgba(255,180,0,0.2) 35%, transparent 70%)',
            filter: 'blur(8px)',
            animation: 'orbPulse 7s ease-in-out infinite'
          }} />
          <div style={{
            position: 'absolute', top: '-10%', left: '-10%', width: '120%', height: '120%', borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 50%, rgba(255,215,0,0.3) 0%, transparent 60%)',
            filter: 'blur(12px)',
            animation: 'orbPulse 9s ease-in-out infinite 0.5s'
          }} />
          <div style={{
            position: 'absolute', top: '-15%', left: '-15%', width: '130%', height: '130%', borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 50%, rgba(255,180,0,0.15) 0%, transparent 50%)',
            filter: 'blur(15px)',
            animation: 'orbPulse 11s ease-in-out infinite 1s'
          }} />
        </div>

        {/* Усики пыли (исходят от края облака, пульсируют) */}
        {wisps.map((wisp, idx) => (
          <div
            key={`wisp-${idx}`}
            style={{
              position: 'absolute',
              left: `${centerX}%`,
              top: `${centerY}%`,
              width: `${wisp.length + 5}%`,           // чуть длиннее, чтобы перекрыть отступ
              height: '1px',
              background: `linear-gradient(90deg, transparent 4%, rgba(212,175,55,0.7) 4%)`,
              transform: `rotate(${wisp.angle}deg)`,
              transformOrigin: '0 0',
              opacity: 0.5,
              filter: 'blur(1.5px)',
              animation: `wispPulse ${4 + idx % 3}s ease-in-out infinite alternate`,
              pointerEvents: 'none',
              zIndex: 6
            }}
          />
        ))}

        {/* Парящие блоки */}
        {blocks.map((block, idx) => {
          const [c1, c2] = block.colors
          return (
            <div key={idx} style={{
              position: 'absolute', left: `${block.left}%`, top: `${block.top}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              cursor: 'pointer', zIndex: 10,
              animation: `drift${idx % 3} ${8 + idx * 2}s ease-in-out infinite alternate`,
              transition: 'transform 0.3s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'; }}
            >
              <div style={{
                fontSize: '24px', fontWeight: 700, lineHeight: 1.2, marginBottom: '4px',
                background: `linear-gradient(135deg, ${c1}, ${c2})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 12px rgba(192,132,252,0.6))',
                textAlign: 'center'
              }}>
                {block.title}
              </div>
              <div style={{
                fontSize: '14px', fontWeight: 400, color: '#eaf0fb',
                filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.5))',
                opacity: 0.85, letterSpacing: '0.3px', textAlign: 'center'
              }}>
                {block.sub}
              </div>
            </div>
          )
        })}

        {/* Кнопка назад */}
        <a href="/" style={{
          position: 'absolute', top: '20px', left: '24px', zIndex: 10, color: '#9aa9c1',
          textDecoration: 'none', fontSize: '16px', background: 'rgba(0,0,0,0.4)',
          padding: '8px 16px', borderRadius: '20px', backdropFilter: 'blur(4px)'
        }}>← На главную</a>
      </div>

      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes breathe1 {
          0% { opacity: 0.7; transform: scaleY(1); }
          100% { opacity: 1; transform: scaleY(1.15); }
        }
        @keyframes breathe2 {
          0% { opacity: 0.5; transform: scaleY(1.05) translateX(-2%); }
          100% { opacity: 0.9; transform: scaleY(1.25) translateX(2%); }
        }
        @keyframes breathe3 {
          0% { opacity: 0.4; transform: scaleY(1.1) translateX(2%); }
          100% { opacity: 0.8; transform: scaleY(1.3) translateX(-2%); }
        }
        @keyframes orbPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes wispPulse {
          0% { opacity: 0.3; transform: rotate(deg) translateX(0); }
          100% { opacity: 0.7; transform: rotate(deg) translateX(4px); }
        }
        @keyframes drift0 {
          0% { transform: translate(-50%, -50%) translateX(-10px); }
          100% { transform: translate(-50%, -50%) translateX(10px); }
        }
        @keyframes drift1 {
          0% { transform: translate(-50%, -50%) translateY(-8px); }
          100% { transform: translate(-50%, -50%) translateY(8px); }
        }
        @keyframes drift2 {
          0% { transform: translate(-50%, -50%) translateX(6px) translateY(4px); }
          100% { transform: translate(-50%, -50%) translateX(-6px) translateY(-4px); }
        }
      `}</style>
    </>
  )
}
