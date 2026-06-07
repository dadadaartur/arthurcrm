import Head from 'next/head'

export default function TestPlanetPage() {
  return (
    <>
      <Head>
        <title>Вид с МКС | Кармический банк</title>
      </Head>

      <div style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#000',
        position: 'relative',
        fontFamily: 'Inter, sans-serif'
      }}>
        {/* Фото Земли */}
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/The_Earth_seen_from_Apollo_17.jpg/1280px-The_Earth_seen_from_Apollo_17.jpg"
          alt="Земля с орбиты"
          style={{
            position: 'absolute',
            bottom: '-20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '120%',
            height: '80%',
            objectFit: 'cover',
            objectPosition: 'center top',
            borderRadius: '50% / 40% 40% 0 0',
            boxShadow: 'inset 0 -40px 80px rgba(0,0,0,0.7)'
          }}
        />

        {/* Атмосферное свечение над горизонтом */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '80px',
          background: 'linear-gradient(to top, rgba(249,115,22,0.35), transparent)',
          animation: 'pulse 6s ease-in-out infinite'
        }} />

        {/* Звёзды */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 80%, transparent 40%, rgba(0,0,0,0.6) 100%)' }}>
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: Math.random() * 100 + '%',
              top: Math.random() * 50 + '%',
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              borderRadius: '50%',
              background: 'white',
              opacity: Math.random() * 0.7 + 0.3
            }} />
          ))}
        </div>

        {/* Текст */}
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10,22,40,0.7)',
          backdropFilter: 'blur(8px)',
          borderRadius: '24px',
          padding: '24px 32px',
          textAlign: 'center',
          border: '1px solid rgba(249,115,22,0.3)',
          color: 'white',
          maxWidth: '400px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '12px',
            background: 'linear-gradient(135deg, #f97316, #c084fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Вид с орбиты</h2>
          <p style={{ color: '#9aa9c1', lineHeight: 1.6 }}>
            Где-то там, внизу, кипит жизнь. Каждая сделка, каждый звонок — часть большой экосистемы.
          </p>
        </div>

        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 0.9; }
          }
        `}</style>
      </div>
    </>
  )
}
