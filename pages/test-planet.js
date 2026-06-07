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

        {/* Динамичный свет внизу – три подвижных слоя */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50%',
          background: `
            radial-gradient(ellipse at 30% 100%, rgba(249,115,22,0.35) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 100%, rgba(251,191,36,0.3) 0%, transparent 55%),
            radial-gradient(ellipse at 50% 100%, rgba(192,132,252,0.25) 0%, transparent 50%)
          `,
          animation: 'glowShift 8s ease-in-out infinite alternate',
          zIndex: 1
        }} />

        {/* Дополнительный слой – медленное горизонтальное смещение */}
        <div style={{
          position: 'absolute', bottom: '-10px', left: '-20%', width: '140%', height: '200px',
          background: 'radial-gradient(ellipse at 50% 100%, rgba(255,209,102,0.4) 0%, transparent 70%)',
          filter: 'blur(10px)',
          animation: 'drift 20s ease-in-out infinite alternate',
          zIndex: 1
        }} />

        {/* Тонкая яркая полоса у самого горизонта (солнечный край) */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60px',
          background: 'linear-gradient(to top, rgba(255,245,200,0.6), transparent)',
          filter: 'blur(4px)',
          animation: 'pulse 6s ease-in-out infinite',
          zIndex: 2
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
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes glowShift {
          0% { opacity: 0.7; transform: scaleX(1); }
          100% { opacity: 1; transform: scaleX(1.2); }
        }
        @keyframes drift {
          0% { transform: translateX(-5%); opacity: 0.5; }
          100% { transform: translateX(5%); opacity: 0.9; }
        }
      `}</style>
    </>
  )
}
