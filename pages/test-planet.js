import Head from 'next/head'

export default function TestPlanetPage() {
  return (
    <>
      <Head>
        <title>Вид с МКС | Кармический банк</title>
      </Head>

      <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
        {/* Звёзды – только в верхней половине экрана */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '50%', zIndex: 0, overflow: 'hidden' }}>
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

        {/* Планета – только нижняя дуга */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50vh', overflow: 'hidden', zIndex: 1 }}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/9/97/The_Earth_seen_from_Apollo_17.jpg"
            alt="Земля"
            style={{
              position: 'absolute', bottom: '-38vh', left: '50%', transform: 'translateX(-50%)',
              width: '140vw', height: '140vw', borderRadius: '50%', objectFit: 'cover',
              objectPosition: 'center 30%', boxShadow: 'inset 0 -40px 100px rgba(0,0,0,0.8)'
            }}
          />
        </div>

        {/* Атмосферное свечение над горизонтом */}
        <div style={{
          position: 'absolute', bottom: '50vh', left: 0, width: '100%', height: '40px',
          background: 'linear-gradient(to top, rgba(249,115,22,0.5), transparent)',
          animation: 'pulse 10s ease-in-out infinite', zIndex: 2
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
          50% { opacity: 0.7; }
        }
      `}</style>
    </>
  )
}
