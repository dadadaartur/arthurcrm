import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

export default function TestPlanetPage() {
  const [loading, setLoading] = useState(true)

  // Имитация загрузки для плавного появления
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <Head>
        <title>Тест планеты | Кармический банк</title>
      </Head>

      <div className={`min-h-screen flex flex-col ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}>
        {/* Шапка как в банке */}
        <header className="flex justify-between items-center px-6 py-2 relative z-10 bg-transparent">
          <Link href="/" className="text-base font-bold bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
            Кармический банк
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Вернуться на главную
          </Link>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          {/* Контейнер планеты */}
          <div className="planet-earth-container">
            <div className="earth-core"></div>
            <div className="atmosphere-glow"></div>
            <div className="floating-clouds"></div>
          </div>

          <div className="planet-info-panel">
            <h2>Наш общий дом</h2>
            <p>
              Это место, где все мы живём, работаем и любим. Летний сезон в разгаре, и Земля прекрасна.
              Не забывайте заботиться о ней так же, как и о своих клиентах!
            </p>
          </div>
        </main>
      </div>

      {/* Стили только для этой страницы */}
      <style jsx global>{`
        .planet-earth-container {
          position: relative;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          box-shadow: 0 0 60px rgba(249, 115, 22, 0.3), 0 0 120px rgba(249, 115, 22, 0.15);
          overflow: hidden;
          margin-bottom: 40px;
        }

        /* Градиентная планета (Земля) */
        .earth-core {
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 40% 50%,
            #34D399 5%,
            #6EE7B7 25%,
            #059669 45%,
            #3B82F6 65%,
            #1D4ED8 80%,
            #0B3D91 100%);
        }

        /* Атмосфера – свечение и пульсация */
        .atmosphere-glow {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          box-shadow: inset 0 0 80px rgba(249, 115, 22, 0.3),
                      0 0 120px rgba(249, 115, 22, 0.4);
          animation: glowPulse 6s ease-in-out infinite;
        }

        /* Облака */
        .floating-clouds {
          position: absolute;
          top: 0;
          left: 0;
          width: 200%;
          height: 100%;
          background-image: url("data:image/svg+xml,%3Csvg width='200' height='480' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 300 Q40 280 60 300 Q80 320 100 300 Q120 280 140 300 Q160 320 180 300' fill='none' stroke='white' stroke-width='4' stroke-opacity='0.2' /%3E%3C/svg%3E");
          opacity: 0.1;
          animation: cloudsDrift 120s linear infinite;
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

        @keyframes glowPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes cloudsDrift {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </>
  )
}
