import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

export default function TestPlanetPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <Head>
        <title>Вид с МКС | Кармический банк</title>
      </Head>

      <div className={`viewport ${loading ? 'loading' : ''}`}>
        {/* Шапка */}
        <header className="top-bar">
          <Link href="/" className="logo">Кармический банк</Link>
          <Link href="/" className="back-link">← Вернуться на главную</Link>
        </header>

        {/* Звёздный фон */}
        <div className="stars"></div>

        {/* Планета и всё, что над ней */}
        <div className="earth-container">
          <div className="earth-planet"></div>
          <div className="atmosphere"></div>
          <div className="city-lights"></div>
        </div>

        {/* Панель с текстом */}
        <div className="info-panel">
          <h2>Вид с орбиты</h2>
          <p>
            Где-то там, внизу, кипит жизнь. Каждая сделка, каждый звонок — часть большой экосистемы.
            Смотрите вперёд, но не забывайте смотреть по сторонам.
          </p>
        </div>
      </div>

      <style jsx global>{`
        /* Сбрасываем отступы и убираем скролл */
        html, body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: #000;
          font-family: 'Inter', sans-serif;
        }

        .viewport {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          transition: opacity 0.5s ease;
        }
        .viewport.loading { opacity: 0; }

        /* Шапка */
        .top-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 48px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 24px;
          z-index: 10;
          background: transparent;
        }
        .logo {
          font-size: 18px;
          font-weight: 700;
          background: linear-gradient(135deg, #f97316, #c084fc);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-decoration: none;
        }
        .back-link {
          font-size: 14px;
          color: #9aa9c1;
          text-decoration: none;
          transition: color 0.2s;
        }
        .back-link:hover { color: white; }

        /* Звёздный фон */
        .stars {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 100%, #0a1628 0%, #000 70%);
        }
        .stars::before {
          content: '';
          position: absolute;
          inset: 0;
          box-shadow:
            50px 30px 0 0 rgba(255,255,255,0.8),
            120px 80px 0 0 rgba(255,255,255,0.6),
            200px 40px 0 0 rgba(255,255,255,0.9),
            350px 90px 0 0 rgba(255,255,255,0.5),
            500px 20px 0 0 rgba(255,255,255,0.7),
            650px 70px 0 0 rgba(255,255,255,0.8),
            780px 50px 0 0 rgba(255,255,255,0.6),
            400px 150px 0 0 rgba(255,255,255,0.4),
            100px 200px 0 0 rgba(255,255,255,0.7),
            300px 180px 0 0 rgba(255,255,255,0.5),
            600px 160px 0 0 rgba(255,255,255,0.6),
            750px 220px 0 0 rgba(255,255,255,0.8),
            200px 250px 0 0 rgba(255,255,255,0.5),
            500px 240px 0 0 rgba(255,255,255,0.4),
            80px 300px 0 0 rgba(255,255,255,0.6),
            350px 280px 0 0 rgba(255,255,255,0.5),
            700px 300px 0 0 rgba(255,255,255,0.7),
            150px 350px 0 0 rgba(255,255,255,0.5),
            450px 320px 0 0 rgba(255,255,255,0.6);
          border-radius: 50%;
          opacity: 0.8;
        }

        /* Контейнер планеты: занимает нижнюю часть экрана */
        .earth-container {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 55vh; /* высота области, где видна Земля */
          overflow: hidden;
        }

        /* Сама планета – огромный круг */
        .earth-planet {
          position: absolute;
          bottom: -35vh; /* показываем только верхнюю дугу */
          left: 50%;
          transform: translateX(-50%);
          width: 130vw;
          height: 130vw;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 70%,
            #0B3D91 0%,
            #1D4ED8 20%,
            #3B82F6 35%,
            #6EE7B7 45%,
            #34D399 48%,
            #059669 52%,
            #064E3B 55%,
            #0B3D91 70%,
            #000 100%);
          box-shadow: inset 0 -20px 60px rgba(0,0,0,0.5);
        }

        /* Атмосферное свечение прямо над горизонтом */
        .atmosphere {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 50px;
          background: linear-gradient(to top, rgba(249,115,22,0.3), transparent);
          animation: pulse 8s ease-in-out infinite;
        }

        /* Огни городов – тонкая полоса с эффектом свечения */
        .city-lights {
          position: absolute;
          bottom: 5px;
          left: 10%;
          width: 80%;
          height: 25px;
          background: radial-gradient(ellipse at center, rgba(251,191,36,0.4) 0%, transparent 70%);
          filter: blur(4px);
          animation: flicker 4s ease-in-out infinite alternate;
        }

        .info-panel {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(21, 34, 56, 0.8);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(249, 115, 22, 0.3);
          border-radius: 24px;
          padding: 28px;
          max-width: 480px;
          width: 90%;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
          z-index: 10;
        }
        .info-panel h2 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #f97316, #c084fc);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .info-panel p {
          color: #9aa9c1;
          line-height: 1.6;
          font-size: 15px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes flicker {
          0% { opacity: 0.4; }
          100% { opacity: 0.8; }
        }
      `}</style>
    </>
  )
}
