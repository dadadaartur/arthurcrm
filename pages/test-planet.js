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

      <div className={`min-h-screen flex flex-col ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}>
        <header className="flex justify-between items-center px-6 py-2 relative z-10 bg-transparent">
          <Link href="/" className="text-base font-bold bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
            Кармический банк
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Вернуться на главную
          </Link>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
          {/* Звёздный фон */}
          <div className="stars-bg absolute inset-0"></div>

          {/* Вид Земли снизу */}
          <div className="earth-view-container">
            <div className="earth-curve"></div>
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
          background-image: url("data:image/svg+xml,%3Csvg width='800' height='600' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='100' cy='50' r='1.5' fill='white' opacity='0.7'/%3E%3Ccircle cx='350' cy='120' r='1' fill='white' opacity='0.5'/%3E%3Ccircle cx='600' cy='80' r='2' fill='white' opacity='0.8'/%3E%3Ccircle cx='200' cy='180' r='1' fill='white' opacity='0.6'/%3E%3Ccircle cx='750' cy='200' r='1.5' fill='white' opacity='0.7'/%3E%3Ccircle cx='450' cy='40' r='1' fill='white' opacity='0.4'/%3E%3Ccircle cx='50' cy='300' r='1.5' fill='white' opacity='0.5'/%3E%3Ccircle cx='700' cy='350' r='1' fill='white' opacity='0.6'/%3E%3C/svg%3E");
          background-size: cover;
          opacity: 0.6;
        }

        .earth-view-container {
          position: relative;
          width: 100%;
          max-width: 800px;
          height: 400px;
          margin-bottom: 40px;
          overflow: hidden;
          border-radius: 50% / 30% 30% 0 0;
          box-shadow: 0 -10px 40px rgba(249, 115, 22, 0.2);
        }

        /* Кривизна Земли */
        .earth-curve {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50% / 30% 30% 0 0;
          background: radial-gradient(circle at 50% 130%, 
            #0B3D91 0%,          /* глубокий океан */
            #1D4ED8 20%,         /* океан */
            #3B82F6 35%,         /* светлая вода */
            #6EE7B7 45%,         /* мелководье */
            #34D399 48%,         /* зелень */
            #059669 52%,         /* тёмная зелень */
            #064E3B 55%,         /* лес */
            #0B3D91 70%,         /* океан */
            #000 100%);          /* космос */
          box-shadow: inset 0 -20px 60px rgba(0,0,0,0.5);
        }

        /* Атмосферное свечение по дуге */
        .atmosphere-arc {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50% / 30% 30% 0 0;
          background: transparent;
          box-shadow: 
            0 0 80px rgba(249, 115, 22, 0.3) inset,
            0 -20px 60px rgba(249, 115, 22, 0.2);
          animation: atmospherePulse 8s ease-in-out infinite;
        }

        /* Огни городов */
        .city-lights {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50% / 30% 30% 0 0;
          background: url("data:image/svg+xml,%3Csvg width='400' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='160' r='2' fill='%23FBBF24' opacity='0.6'/%3E%3Ccircle cx='120' cy='140' r='1.5' fill='%23FBBF24' opacity='0.5'/%3E%3Ccircle cx='200' cy='150' r='2' fill='%23F59E0B' opacity='0.7'/%3E%3Ccircle cx='280' cy='170' r='1.5' fill='%23FBBF24' opacity='0.4'/%3E%3Ccircle cx='340' cy='155' r='2' fill='%23F59E0B' opacity='0.6'/%3E%3Ccircle cx='180' cy='130' r='1' fill='%23FDE047' opacity='0.8'/%3E%3Ccircle cx='310' cy='145' r='1.5' fill='%23FBBF24' opacity='0.5'/%3E%3C/svg%3E");
          background-size: cover;
          opacity: 0.3;
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
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes lightsFlicker {
          0% { opacity: 0.2; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </>
  )
}
