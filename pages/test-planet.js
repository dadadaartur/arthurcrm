import Head from 'next/head'

export default function TestPlanetPage() {
  return (
    <>
      <Head>
        <title>Вид с МКС | Кармический банк</title>
      </Head>

      <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
        {/* Звёзды – только верхняя половина */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '55%', zIndex: 0 }}>
          {Array.from({ length: 120 }).map((_, i) => {
            const size = Math.random() * 2.5 + 0.8
            const colors = ['#ffffff', '#ffe0d0', '#ffddaa', '#d0e0ff', '#ffffdd']
            const color = colors[Math.floor(Math.random() * colors.length)]
            return (
              <div key={i} style={{
                position: 'absolute', left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
                width: size + 'px', height: size + 'px', borderRadius: '50%', background: color,
                boxShadow: `0 0 ${size * 1.5}px ${color}`,
                opacity: Math.random() * 0.4 + 0.3,
                animation: `twinkle ${Math.random() * 8 + 6}s ease-in-out infinite`,
                animationDelay: Math.random() * 10 + 's'
              }} />
            )
          })}
        </div>

        {/* Планета – только нижняя часть с мягким затемнением */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '55vh', overflow: 'hidden', zIndex: 1 }}>
          {/* Само изображение */}
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/9/97/The_Earth_seen_from_Apollo_17.jpg"
            alt="Земля"
            style={{
              position: 'absolute', bottom: '-30vh', left: '50%', transform: 'translateX(-50%)',
              width: '130vw', height: '130vw', borderRadius: '50%', objectFit: 'cover',
              objectPosition: 'center 30%'
            }}
          />
          {/* Градиентная тень по краю (создаёт эффект атмосферного рассеивания) */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%',
            background: 'radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 30%, transparent 60%)',
          }} />
        </div>

        {/* Атмосферное свечение над горизонтом (размытое и широкое) */}
        <div style={{
          position: 'absolute', bottom: '55vh', left: 0, width: '100%', height: '60px',
          background: 'linear-gradient(to top, rgba(249,115,22,0.6), transparent)',
          filter: 'blur(8px)', zIndex: 2, animation: 'pulse 10s ease-in-out infinite'
        }} />

        {/* Кнопка назад */}
        <a href="/" style={{
          position: 'absolute', top: '20px', left: '24px', zIndex: 10, color: '#9aa9c1',
          textDecoration: 'none', fontSize: '16px', background: 'rgba(0,0,0,0.4)',
          padding: '8px 16px', borderRadius: '20px', backdropFilter: 'blur(4px)'
        }}>← На главную</a>
      </div>

      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.03); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </>
  )
}
