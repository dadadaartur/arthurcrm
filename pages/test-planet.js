import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'

function getKarmikWord(n) {
  const lastDigit = n % 10
  const lastTwoDigits = n % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'кармиков'
  if (lastDigit === 1) return 'кармик'
  if (lastDigit >= 2 && lastDigit <= 4) return 'кармика'
  return 'кармиков'
}

export default function TestPlanetPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: bal } = await supabase.from('karma_balance').select('balance').eq('user_id', user.id).single()
      if (bal) setBalance(bal.balance)
      setLoading(false)
    }
    init()
  }, [])

  const centerX = 58
  const centerY = 40

  const blocks = [
    { title: 'Чемпионат', sub: 'менеджеров', left: 80, top: 40, colors: ['#7AC78F', '#c084fc'] },
    { title: 'Гороскоп',   sub: 'профессий',  left: 67.5, top: 61.7, colors: ['#c084fc', '#F28B82'] },
    { title: 'Журнал ПРО', sub: 'лучшие практики', left: 42.5, top: 61.7, colors: ['#c084fc', '#7AC78F'] },
    { title: 'Квиз',       sub: 'проверь себя', left: 35, top: 35, colors: ['#7AC78F', '#F28B82'] },
    { title: 'ИИ‑питомец', sub: 'учи и развивай', left: 42.5, top: 18.3, colors: ['#A3E0B0', '#d4af37'] },
    { title: 'Битва',      sub: 'отделов',      left: 67.5, top: 18.3, colors: ['#d4af37', '#A3E0B0'] }
  ]

  const beams = blocks.map(block => {
    const dx = block.left - centerX
    const dy = block.top - centerY
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    const length = Math.sqrt(dx * dx + dy * dy) * 0.5
    return { angle, length }
  })

  if (loading) return <div style={{ color:'white', textAlign:'center', paddingTop:100 }}>Загрузка...</div>

  const karmikWord = getKarmikWord(balance)

  // Планеты-кнопки: координаты относительно центра звезды (0,0)
  const planets = [
    { label: 'Перевести', path: '/transfer', orbit: 110, speed: 20, color1: '#4a6fa5', color2: '#1a2f4a', type: 'gas' },
    { label: 'Операции', path: '/history', orbit: 150, speed: 28, color1: '#8b7d6b', color2: '#3a3127', type: 'rock' },
    { label: 'Покупки', path: '/my-purchases', orbit: 130, speed: 24, color1: '#5ba0c8', color2: '#1e3a5f', type: 'ice' },
    { label: 'Магазин', path: '/shop', orbit: 170, speed: 32, color1: '#c87a3a', color2: '#5a2a1a', type: 'lava' }
  ]

  return (
    <>
      <Head>
        <title>Вид с МКС | Кармический банк</title>
      </Head>

      <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
        {/* Звёзды */}
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

        {/* Мягкие переливы внизу */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
          <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 100%, rgba(255,100,50,0.5) 0%, rgba(255,100,50,0.2) 40%, transparent 75%)', animation: 'breathe1 12s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: 0, left: '-10%', width: '120%', height: '100%', background: 'radial-gradient(ellipse at 30% 100%, rgba(255,100,150,0.25) 0%, transparent 70%)', filter: 'blur(8px)', animation: 'breathe2 16s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: 0, right: '-10%', width: '120%', height: '100%', background: 'radial-gradient(ellipse at 70% 100%, rgba(130,100,255,0.4) 0%, transparent 70%)', filter: 'blur(10px)', animation: 'breathe3 20s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: 0, left: '10%', width: '80%', height: '50%', background: 'radial-gradient(ellipse at 50% 100%, rgba(255,200,100,0.2) 0%, transparent 60%)', filter: 'blur(12px)', animation: 'breathe4 15s ease-in-out infinite alternate' }} />
        </div>

        {/* Чёрная дыра (центр притяжения) */}
        <div style={{
          position: 'absolute', left: `${centerX}%`, top: `${centerY}%`,
          transform: 'translate(-50%, -50%)', width: '80px', height: '80px', zIndex: 5
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,180,0,0.4) 0%, rgba(255,100,0,0.2) 30%, transparent 60%)',
            filter: 'blur(14px)', animation: 'orbitSpin 10s linear infinite'
          }} />
          <div style={{
            position: 'absolute', top: '-5%', left: '-5%', width: '110%', height: '110%', borderRadius: '50%',
            background: 'radial-gradient(circle at 45% 45%, rgba(255,200,100,0.5) 0%, rgba(200,100,255,0.2) 40%, transparent 70%)',
            filter: 'blur(10px)', animation: 'orbitSpin 8s linear infinite reverse'
          }} />
          <div style={{
            position: 'absolute', top: '15%', left: '15%', width: '70%', height: '70%', borderRadius: '50%',
            background: 'radial-gradient(circle, #000 0%, #0a0a0a 40%, transparent 80%)',
            boxShadow: '0 0 30px rgba(255,215,0,0.4), 0 0 60px rgba(255,180,0,0.2)',
            filter: 'blur(2px)', animation: 'blackHoleBreath 6s ease-in-out infinite'
          }} />
        </div>

        {/* Лучи-рукава */}
        {beams.map((beam, idx) => (
          <div key={`beam-${idx}`} style={{
            position: 'absolute', left: `${centerX}%`, top: `${centerY}%`,
            width: `${beam.length}%`, height: '1px',
            background: `linear-gradient(90deg, rgba(255,200,50,0) 0%, rgba(255,180,0,0.2) 30%, rgba(255,140,0,0.35) 60%, transparent 100%)`,
            transform: `rotate(${beam.angle}deg)`, transformOrigin: '0 0',
            filter: 'blur(3px)', animation: `beamPulse ${4 + idx % 3}s ease-in-out infinite alternate ${idx * 0.3}s`,
            pointerEvents: 'none', zIndex: 6
          }} />
        ))}

        {/* Парящие кнопки меню */}
        {blocks.map((block, idx) => {
          const [c1, c2] = block.colors
          return (
            <div key={idx} style={{
              position: 'absolute', left: `${block.left}%`, top: `${block.top}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              cursor: 'pointer', zIndex: 10,
              animation: `drift${idx % 3} ${8 + idx * 2}s ease-in-out infinite alternate`,
              transition: 'transform 0.3s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'; }}
            >
              <div style={{
                fontSize: '16px', fontWeight: 600, lineHeight: 1.2, marginBottom: '4px',
                background: `linear-gradient(135deg, ${c1}, ${c2})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 10px rgba(192,132,252,0.6))', textAlign: 'center'
              }}>
                {block.title}
              </div>
              <div style={{
                fontSize: '13px', fontWeight: 400, color: '#eaf0fb',
                filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.5))', opacity: 0.85, textAlign: 'center'
              }}>
                {block.sub}
              </div>
            </div>
          )
        })}

        {/* === БЛОК БАЛАНСА — ЗВЕЗДА СТИВЕНСОН 2-18 С ПЛАНЕТАМИ === */}
        <div style={{
          position: 'absolute',
          left: '4%',
          top: '4%',
          zIndex: 20,
          animation: 'driftBalance 15s ease-in-out infinite alternate'
        }}>
          {/* Звезда */}
          <div style={{
            position: 'relative',
            width: 180,
            height: 180,
            margin: '0 auto 30px auto',
            transform: 'scale(1)',
            animation: 'starPulse 6s ease-in-out infinite'
          }}>
            {/* Внешняя корона */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 180, height: 180,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,120,0,0.9) 0%, rgba(255,60,0,0.4) 40%, transparent 70%)',
              filter: 'blur(8px)',
              animation: 'coronaPulse 4s ease-in-out infinite alternate'
            }} />
            {/* Протуберанцы (дуги) */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 200, height: 200,
              borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: 'rgba(255,200,50,0.7)',
              borderRightColor: 'rgba(255,100,0,0.5)',
              filter: 'blur(3px)',
              animation: 'protuberance1 3s linear infinite'
            }} />
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 190, height: 190,
              borderRadius: '50%',
              border: '2px solid transparent',
              borderBottomColor: 'rgba(255,140,0,0.6)',
              borderLeftColor: 'rgba(255,80,0,0.4)',
              filter: 'blur(2px)',
              animation: 'protuberance2 4s linear infinite reverse'
            }} />
            {/* Ядро звезды */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 120, height: 120,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 40% 40%, #ffffff 0%, #ffe066 10%, #ff9900 30%, #cc3300 70%, #330000 100%)',
              boxShadow: '0 0 40px rgba(255,100,0,0.9), 0 0 80px rgba(255,50,0,0.6), 0 0 120px rgba(255,0,0,0.4)',
              animation: 'coreSpin 10s linear infinite'
            }} />
            {/* Грануляция (живые пятна) */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 100, height: 100,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5) 0%, transparent 40%), radial-gradient(circle at 60% 50%, rgba(255,200,0,0.4) 0%, transparent 30%), radial-gradient(circle at 20% 70%, rgba(255,100,0,0.3) 0%, transparent 35%)',
              filter: 'blur(4px)',
              animation: 'granulation 5s ease-in-out infinite alternate'
            }} />
            {/* Цифра баланса */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
              fontSize: 38,
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              color: 'white',
              textShadow: '0 0 15px rgba(255,255,255,0.8), 0 0 30px rgba(255,200,0,0.8)',
              letterSpacing: 2
            }}>
              {balance}
            </div>
            {/* Голограммная подпись "кармиков" */}
            <div style={{
              position: 'absolute',
              bottom: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 2,
              fontSize: 10,
              fontWeight: 300,
              fontFamily: 'Inter, sans-serif',
              color: 'rgba(255,255,255,0.9)',
              textShadow: '0 0 6px rgba(255,200,100,0.8), 0 0 12px rgba(255,150,0,0.6)',
              letterSpacing: 1,
              whiteSpace: 'nowrap',
              opacity: 0.9,
              background: 'linear-gradient(90deg, transparent, rgba(255,200,50,0.3), transparent)',
              padding: '0 8px',
              borderRadius: 10,
              animation: 'hologramFlicker 2s infinite'
            }}>
              {karmikWord}
            </div>
          </div>

          {/* Планеты */}
          <div style={{
            position: 'relative',
            width: 300,
            height: 300,
            margin: '0 auto'
          }}>
            {planets.map((planet, idx) => (
              <div
                key={idx}
                onClick={() => router.push(planet.path)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: planet.orbit * 2,
                  height: planet.orbit * 2,
                  marginTop: -planet.orbit,
                  marginLeft: -planet.orbit,
                  animation: `orbitSpin ${planet.speed}s linear infinite`,
                  zIndex: 1
                }}
              >
                {/* Орбита (пунктир) */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0,
                  width: '100%', height: '100%',
                  borderRadius: '50%',
                  border: '1px dashed rgba(255,255,255,0.2)',
                  boxSizing: 'border-box',
                  animation: 'orbitDash 2s linear infinite'
                }} />
                {/* Сама планета */}
                <div
                  style={{
                    position: 'absolute',
                    top: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: `radial-gradient(circle at 30% 30%, ${planet.color1}, ${planet.color2})`,
                    boxShadow: `0 0 10px ${planet.color1}, 0 0 20px ${planet.color2}`,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    animation: `planetGlow ${2 + idx}s ease-in-out infinite alternate`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.width = '24px';
                    e.currentTarget.style.height = '24px';
                    e.currentTarget.style.top = '-12px';
                    e.currentTarget.style.boxShadow = `0 0 20px ${planet.color1}, 0 0 40px ${planet.color2}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.width = '16px';
                    e.currentTarget.style.height = '16px';
                    e.currentTarget.style.top = '-8px';
                    e.currentTarget.style.boxShadow = `0 0 10px ${planet.color1}, 0 0 20px ${planet.color2}`;
                  }}
                />
                {/* Название планеты (скрыто по умолчанию) */}
                <div style={{
                  position: 'absolute',
                  top: -30,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 10,
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.7)',
                  whiteSpace: 'nowrap',
                  textShadow: '0 0 4px rgba(255,200,100,0.5)',
                  opacity: 0,
                  transition: 'opacity 0.3s',
                  pointerEvents: 'none'
                }}
                className="planet-label"
                >
                  {planet.label}
                </div>
              </div>
            ))}
            {/* Показать названия при наведении на контейнер планет (опционально) */}
          </div>
        </div>
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
        @keyframes breathe4 {
          0% { opacity: 0.3; transform: scale(1); }
          100% { opacity: 0.6; transform: scale(1.1); }
        }
        @keyframes orbitSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes blackHoleBreath {
          0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(255,215,0,0.4), 0 0 60px rgba(255,180,0,0.2); }
          50% { transform: scale(1.1); box-shadow: 0 0 50px rgba(255,215,0,0.6), 0 0 90px rgba(255,180,0,0.35); }
        }
        @keyframes beamPulse {
          0% { opacity: 0.2; }
          100% { opacity: 0.55; }
        }
        @keyframes drift0 {
          0% { transform: translate(-50%, -50%) translateX(-8px) translateY(4px); }
          100% { transform: translate(-50%, -50%) translateX(8px) translateY(-4px); }
        }
        @keyframes drift1 {
          0% { transform: translate(-50%, -50%) translateX(6px) translateY(-6px); }
          100% { transform: translate(-50%, -50%) translateX(-6px) translateY(6px); }
        }
        @keyframes drift2 {
          0% { transform: translate(-50%, -50%) translateX(-7px) translateY(-5px); }
          100% { transform: translate(-50%, -50%) translateX(7px) translateY(5px); }
        }
        @keyframes driftBalance {
          0% { transform: translate(0, 0); }
          100% { transform: translate(8px, -8px); }
        }
        @keyframes starPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes coronaPulse {
          0% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes protuberance1 {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes protuberance2 {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(-360deg); }
        }
        @keyframes coreSpin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes granulation {
          0% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
        }
        @keyframes hologramFlicker {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; text-shadow: 0 0 8px rgba(255,200,100,1), 0 0 16px rgba(255,150,0,0.9); }
        }
        @keyframes orbitDash {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -20; }
        }
        @keyframes planetGlow {
          0% { box-shadow: 0 0 5px currentColor, 0 0 10px currentColor; }
          100% { box-shadow: 0 0 15px currentColor, 0 0 30px currentColor; }
        }
        /* Показываем название планеты при наведении на весь орбитальный контейнер */
        div[style*="animation: orbitSpin"]:hover .planet-label {
          opacity: 1 !important;
        }
      `}</style>
    </>
  )
}
