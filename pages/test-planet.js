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
        background: '#000',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'Inter, sans-serif'
      }}>
        {/* Звёзды */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 100%, #0a1628 0%, #000 70%)'
        }}>
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: Math.random() * 100 + '%',
              top: Math.random() * 60 + '%',
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              borderRadius: '50%',
              background: 'white',
              opacity: Math.random() * 0.7 + 0.3
            }} />
          ))}
        </div>

        {/* Планета */}
        <div style={{
          position: 'absolute',
          bottom: '-40vh',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '150vw',
          height: '150vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 70%, #0B3D91 0%, #1D4ED8 20%, #3B82F6 35%, #6EE7B7 45%, #34D399 48%, #059669 52%, #064E3B 55%, #0B3D91 70%, #000 100%)',
          boxShadow: 'inset 0 -20px 60px rgba(0,0,0,0.5)'
        }} />

        {/* Атмосферное свечение */}
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          width: '100%',
          height: '60px',
          background: 'linear-gradient(to top, rgba(249,115,22,0.4), transparent)',
          animation: 'pulse 8s ease-in-out infinite'
        }} />

        {/* Текст */}
        <div style={{
          position: 'absolute',
          bottom: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          color: 'white',
          background: 'rgba(10,22,40,0.7)',
          backdropFilter: 'blur(8px)',
          borderRadius: '24px',
          padding: '24px 32px',
          maxWidth: '400px',
          border: '1px solid rgba(249,115,22,0.3)'
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
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    </>
  )
}
