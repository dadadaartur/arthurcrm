import Head from 'next/head'

export default function TestPlanetPage() {
  return (
    <>
      <Head>
        <title>Вид с МКС | Кармический банк</title>
      </Head>

      <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
        {/* Звёзды */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {Array.from({ length: 150 }).map((_, i) => {
            const size = Math.random() * 3 + 1
            const colors = ['#fff', '#ffcccc', '#ffdd99', '#ccccff', '#ffffcc']
            const color = colors[Math.floor(Math.random() * colors.length)]
            return (
              <div key={i} style={{
                position: 'absolute', left: Math.random() * 100 + '%', top: Math.random() * 55 + '%',
                width: size + 'px', height: size + 'px', borderRadius: '50%', background: color,
                boxShadow: `0 0 ${size * 2}px ${color}`, opacity: Math.random() * 0.7 + 0.3,
                animation: `twinkle ${Math.random() * 4 + 3}s ease-in-out infinite`,
                animationDelay: Math.random() * 6 + 's'
              }} />
            )
          })}
        </div>

        {/* Планета – твоя фотография из папки public */}
        <img
          src="/earth.jpg"
          alt="Земля"
          style={{
            position: 'absolute', bottom: '-30vh', left: '50%', transform: 'translateX(-50%)',
            width: '130vw', height: '130vw', borderRadius: '50%', objectFit: 'cover',
            objectPosition: 'center top', boxShadow: 'inset 0 -40px 100px rgba(0,0,0,0.8)', zIndex: 1
          }}
        />

        {/* Атмосфера */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%', height: '70px',
          background: 'linear-gradient(to top, rgba(249,115,22,0.5), transparent)',
          animation: 'pulse 8s ease-in-out infinite', zIndex: 2
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
          0%, 100% { opacity: 0.2; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </>
  )
}
