import Head from 'next/head'

export default function TestPlanetPage() {
  return (
    <>
      <Head>
        <title>Вид с МКС | Кармический банк</title>
      </Head>

      <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
        {/* Звёзды – только верхняя часть */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '65%', zIndex: 0 }}>
          {Array.from({ length: 130 }).map((_, i) => {
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

        {/* Свечение снизу – имитация солнечного света за горизонтом */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%', height: '45%',
          background: `
            radial-gradient(ellipse at 50% 100%, rgba(249,115,22,0.25) 0%, transparent 60%),
            radial-gradient(ellipse at 30% 90%, rgba(251,191,36,0.2) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 85%, rgba(192,132,252,0.15) 0%, transparent 50%)
          `,
          animation: 'glowShift 12s ease-in-out infinite alternate',
          zIndex: 1
        }} />

        {/* Дополнительный мягкий рассеянный свет прямо у горизонта */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%', height: '120px',
          background: 'linear-gradient(to top, rgba(249,115,22,0.5), transparent)',
          filter: 'blur(12px)',
          animation: 'pulse 8s ease-in-out infinite',
          zIndex: 1
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
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes glowShift {
          0% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `}</style>
    </>
  )
}
