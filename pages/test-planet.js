import { useEffect, useRef } from 'react'
import Head from 'next/head'

export default function TestPlanetPage() {
  const starsRef = useRef(null)

  useEffect(() => {
    const container = starsRef.current
    if (!container) return

    // Очищаем старые звёзды, если есть
    container.innerHTML = ''

    // Создаём 100 мерцающих звёзд
    for (let i = 0; i < 100; i++) {
      const star = document.createElement('div')
      star.style.position = 'absolute'
      star.style.left = Math.random() * 100 + '%'
      star.style.top = Math.random() * 60 + '%' // только в верхней части (над планетой)
      const size = Math.random() * 3 + 1
      star.style.width = size + 'px'
      star.style.height = size + 'px'
      star.style.borderRadius = '50%'
      star.style.background = 'white'
      star.style.opacity = Math.random() * 0.7 + 0.3
      star.style.animation = `twinkle ${Math.random() * 4 + 2}s ease-in-out infinite`
      star.style.animationDelay = Math.random() * 5 + 's'
      container.appendChild(star)
    }
  }, [])

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
        {/* Мерцающие звёзды */}
        <div ref={starsRef} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />

        {/* Планета Земля — CSS‑градиент */}
        <div style={{
          position: 'absolute',
          bottom: '-35vh',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '140vw',
          height: '140vw',
          borderRadius: '50%',
          background: `
            radial-gradient(circle at 35% 65%, #0B3D91 0%, #1D4ED8 18%, #3B82F6 30%, transparent 40%),
            radial-gradient(circle at 65% 70%, #064E3B 0%, #059669 15%, #34D399 25%, transparent 35%),
            radial-gradient(circle at 50% 55%, #6EE7B7 0%, #34D399 20%, transparent 30%),
            radial-gradient(circle at 50% 80%, #0B3D91 0%, #000 70%)
          `,
          boxShadow: 'inset 0 -30px 80px rgba(0,0,0,0.7)',
          zIndex: 0
        }} />

        {/* Атмосферное свечение */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '60px',
          background: 'linear-gradient(to top, rgba(249,115,22,0.4), transparent)',
          animation: 'pulse 8s ease-in-out infinite',
          zIndex: 2
        }} />

        {/* Кнопка возврата (только стрелка) */}
        <a href="/" style={{
          position: 'absolute',
          top: '20px',
          left: '24px',
          zIndex: 10,
          color: '#9aa9c1',
          textDecoration: 'none',
          fontSize: '16px',
          transition: 'color 0.2s',
          background: 'rgba(0,0,0,0.4)',
          padding: '8px 16px',
          borderRadius: '20px',
          backdropFilter: 'blur(4px)'
        }}
        onMouseEnter={(e) => e.target.style.color = 'white'}
        onMouseLeave={(e) => e.target.style.color = '#9aa9c1'}
        >
          ← На главную
        </a>
      </div>

      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </>
  )
}
