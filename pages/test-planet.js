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

      <div className={`min-h-screen flex flex-col ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}
        style={{ overflow: 'hidden' }}>
        <header className="flex justify-between items-center px-6 py-2 relative z-10 bg-transparent">
          <Link href="/" className="text-base font-bold bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
            Кармический банк
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Вернуться на главную
          </Link>
        </header>

        <main className="flex-1 flex flex-col items-center justify-end px-4 pb-8 relative" style={{ overflow: 'hidden' }}>
          {/* Звёздный фон */}
          <div className="stars-bg absolute inset-0"></div>

          {/* Земля — большой круг, уходящий за нижний край */}
          <div className="earth-wrapper">
            <div className="earth-planet"></div>
            <div className="atmosphere-arc"></div>
            <div className="city-lights"></div>
          </div>

          <div className="planet-info-panel">
            <h2>Вид с орбиты</h2>
            <p>
              Где-то там, внизу, кипит жизнь. Каждая сделка, каждый звонок — часть большой экосистемы. Смотрите вперёд, но не забывайте смотреть по сторонам.
            </p>
          </div>
        </main>
      </div>

      <style jsx global>{`
        /* Убираем скролл */
        html, body {
          overflow: hidden;
        }

        .stars-bg {
          background: radial-gradient(ellipse at 50% 100%, #0a1628 0%, #000 70%);
          pointer-events: none;
        }
        .stars-bg::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
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
            700px 300px 0 0 rgba(255,255,255,0.7);
          border-radius: 50%;
          opacity: 0.8;
        }

        .earth-wrapper {
          position: relative;
          width: 100%;
          max-width: 100%;
          height: 50vh; /* Занимает половину экрана */
          display: flex;
          justify-content: center;
          align-items: flex-end;
          overflow: hidden;
        }

        /* Сама планета — круг, который на половину спрятан */
        .earth-planet {
          position: absolute;
          bottom: -40vh; /* Показываем только верхнюю половину */
          left: 50%;
          transform: translateX(-50%);
          width: 120vw; /* Очень широкий круг, чтобы кривизна была заметна */
          height: 120vw;
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

        /* Атмосферное свечение */
        .atmosphere-arc {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 40px; /* Только над горизонтом */
          background: linear-gradient(to top, rgba(249,115,22,0.4), transparent);
          animation: atmospherePulse 8s ease-in-out infinite;
        }

        /* Огни городов (имитация россыпи точек) */
        .city-lights {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .city-lights::before {
          content: '';
          position: absolute;
          bottom: 20px;
          left: 10%;
          width: 80%;
          height: 30px;
          background: radial-gradient(circle, rgba(251,191,36,0.4) 10%, transparent 70%);
          box-shadow: 
            0 0 10px rgba(251,191,36,0.3),
            0 0 20px rgba(245,158,11,0.2);
          animation: lightsFlicker 4s ease-in-out infinite alternate;
        }

        .planet-info-panel {
          background: rgba(21, 34, 56, 0.8);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(249, 115, 22, 0.3);
          border-radius: 24px;
          padding: 32px;
          max-width: 480px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
          z-index: 10;
          margin-bottom: 20px;
        }
        .planet-info-panel h2 {
          font-size: 26px;
          font-weight: 700;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #f97316, #c084fc);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .planet-info-panel p {
          color: #9aa9c1;
          line-height: 1.6;
          font-size: 16px;
        }

        @keyframes atmospherePulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes lightsFlicker {
          0% { opacity: 0.5; }
          100% { opacity: 0.8; }
        }
      `}</style>
    </>
  )
}
