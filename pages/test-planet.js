import Head from 'next/head'

export default function TestPlanetPage() {
  // Пирамида: 3 сверху, 2 в середине, 1 внизу
  const rows = [
    [
      { title: 'Чемпионат', subtitle: 'менеджеров' },
      { title: 'Гороскоп', subtitle: 'профессий' },
      { title: 'Журнал ПРО', subtitle: 'лучшие практики' }
    ],
    [
      { title: 'Квиз', subtitle: 'проверь себя' },
      { title: 'ИИ‑питомец', subtitle: 'учи и развивай' }
    ],
    [
      { title: 'Битва', subtitle: 'отделов' }
    ]
  ]

  const colorPairs = [
    ['#7AC78F', '#c084fc'],
    ['#F28B82', '#f97316'],
    ['#c084fc', '#7AC78F'],
    ['#f97316', '#F28B82'],
    ['#A3E0B0', '#d4af37'],
    ['#d4af37', '#A3E0B0']
  ]
  let colorIndex = 0

  return (
    <>
      <Head>
        <title>Вид с МКС | Кармический банк</title>
      </Head>

      <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
        {/* Звёзды – всё небо */}
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
          animation: 'breathe1 12s ease-in-out infinite alternate',
          zIndex: 1
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: '-10%', width: '120%', height: '100%',
          background: 'radial-gradient(ellipse at 30% 100%, rgba(255,100,150,0.4) 0%, transparent 70%)',
          filter: 'blur(8px)',
          animation: 'breathe2 16s ease-in-out infinite alternate',
          zIndex: 2
        }} />
        <div style={{
          position: 'absolute', bottom: 0, right: '-10%', width: '120%', height: '100%',
          background: 'radial-gradient(ellipse at 70% 100%, rgba(130,100,255,0.4) 0%, transparent 70%)',
          filter: 'blur(10px)',
          animation: 'breathe3 20s ease-in-out infinite alternate',
          zIndex: 2
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%', height: '30%',
          background: 'linear-gradient(to top, rgba(255,220,120,0.7), transparent)',
          filter: 'blur(15px)',
          animation: 'edgeGlow 8s ease-in-out infinite',
          zIndex: 3
        }} />

        {/* Парящие слова – пирамида */}
        <div style={{
          position: 'absolute', top: '10%', left: '8%', right: '8%', bottom: '15%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '30px',
          zIndex: 10
        }}>
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} style={{
              display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap'
            }}>
              {row.map((block) => {
                const [c1, c2] = colorPairs[colorIndex % colorPairs.length]
                colorIndex++
                return (
                  <div key={block.title} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    cursor: 'pointer', transition: 'transform 0.3s',
                    maxWidth: '200px'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <div style={{
                      fontSize: '28px', fontWeight: 700, lineHeight: 1.2, marginBottom: '6px',
                      background: `linear-gradient(135deg, ${c1}, ${c2})`,
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 15px rgba(192,132,252,0.5))',
                      animation: 'textGlow 3s ease-in-out infinite alternate',
                      textAlign: 'center'
                    }}>
                      {block.title}
                    </div>
                    <div style={{
                      fontSize: '16px', fontWeight: 400, color: '#eaf0fb',
                      filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.4))',
                      opacity: 0.9, letterSpacing: '0.5px', textAlign: 'center'
                    }}>
                      {block.subtitle}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

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
        @keyframes edgeGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes textGlow {
          0% { filter: drop-shadow(0 0 15px rgba(192,132,252,0.5)); }
          100% { filter: drop-shadow(0 0 25px rgba(249,115,22,0.7)); }
        }
      `}</style>
    </>
  )
}
