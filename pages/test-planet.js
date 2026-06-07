import { useEffect, useRef } from 'react'
import Head from 'next/head'

export default function TestPlanetPage() {
  const starsRef = useRef(null)

  useEffect(() => {
    const container = starsRef.current
    if (!container) return
    container.innerHTML = ''

    const starColors = [
      '#ffffff', // белый
      '#ffcccc', // красноватый
      '#ffdd99', // оранжевый
      '#ccccff', // голубоватый
      '#aaccff', // синеватый
      '#ffffcc', // желтоватый
    ]

    for (let i = 0; i < 120; i++) {
      const star = document.createElement('div')
      star.style.position = 'absolute'
      star.style.left = Math.random() * 100 + '%'
      star.style.top = Math.random() * 55 + '%' // только в верхней части, над планетой
      const size = Math.random() * 3 + 1.5
      star.style.width = size + 'px'
      star.style.height = size + 'px'
      star.style.borderRadius = '50%'
      const color = starColors[Math.floor(Math.random() * starColors.length)]
      star.style.background = color
      star.style.boxShadow = `0 0 ${size * 2}px ${color}` // размытое свечение
      star.style.opacity = Math.random() * 0.5 + 0.3
      star.style.animation = `twinkle ${Math.random() * 4 + 3}s ease-in-out infinite`
      star.style.animationDelay = Math.random() * 6 + 's'
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
        {/* Звёздное небо (только над планетой) */}
        <div ref={starsRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

        {/* Планета Земля */}
        <div style={{
          position: 'absolute',
          bottom: '-38vh',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '145vw',
          height: '145vw',
          borderRadius: '50%',
          background: `
            /* Океаны */
            radial-gradient(circle at 30% 60%, #1D4ED8 0%, #0B3D91 30%, transparent 50%),
            radial-gradient(circle at 70% 55%, #2563EB 0%, #0B3D91 25%, transparent 45%),
            /* Материки (зелёные и коричневые) */
            radial-gradient(ellipse at 40% 65%, #059669 0%, #064E3B 15%, transparent 30%),
            radial-gradient(ellipse at 55% 70%, #34D399 0%, #059669 10%, transparent 25%),
            radial-gradient(ellipse at 65% 60%, #D97706 0%, #92400E 12%, transparent 25%),
            /* Общая тень */
            radial-gradient(circle at 50% 75%, #000 0%, transparent 70%)
          `,
          boxShadow: 'inset 0 -40px 100px rgba(0,0,0,0.8)',
          zIndex: 1
        }} />

        {/* Атмосферное свечение над горизонтом */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '70px',
          background: 'linear-gradient(to top, rgba(249,115,22,0.5), transparent)',
          animation: 'pulse 8s ease-in-out infinite',
          zIndex: 2
        }} />

        {/* Кнопка "На главную" */}
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
          0%, 100% { opacity: 0.15; transform: scale(0.9); }
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
