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

  // Планеты с медленными орбитами и индивидуальными цветами
  const planets = [
    { label: 'Перевести', path: '/transfer', orbit: 90, speed: 40, color: '#4a6fa5', shadow: '#1a2f4a' },
    { label: 'Операции', path: '/history', orbit: 115, speed: 50, color: '#8b7d6b', shadow: '#3a3127' },
    { label: 'Покупки', path: '/my-purchases', orbit: 135, speed: 45, color: '#5ba0c8', shadow: '#1e3a5f' },
    { label: 'Магазин', path: '/shop', orbit: 155, speed: 55, color: '#c87a3a', shadow: '#5a2a1a' }
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

        {/* === БЛОК БАЛАНСА — ЗВЕЗДА С ПЛАНЕТАМИ (исправлено) === */}
        <div style={{
          position: 'absolute',
          left: '4%',
          top: '5%',
          zIndex: 20,
          width: 360,
          height: 360,
          animation: 'driftBalance 15s ease-in-out infinite alternate'
        }}>
          {/* Центральная звезда */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 140,
            height: 140
          }}>
            {/* Спокойное свечение короны */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 160, height: 160,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,150,0,0.7) 0%, rgba(255,80,0,0.3) 50%, transparent 70%)',
              filter: 'blur(10px)',
              animation: 'starGlow 4s ease-in-out infinite alternate'
            }} />
            {/* Ядро звезды (градиент + тени) */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 100, height: 100,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #fff 5%, #ffe680 25%, #ff8800 60%, #991100 100%)',
              boxShadow: '0 0 30px rgba(255,100,0,0.9), 0 0 60px rgba(255,50,0,0.5)',
              animation: 'coreBreath 3s ease-in-out infinite alternate'
            }} />
            {/* Цифра и слово "кармиков" */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              zIndex: 2,
              lineHeight: 1
            }}>
              <div style={{
                fontSize: 32,
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                color: 'white',
                textShadow: '0 0 12px rgba(255,255,255,0.8), 0 0 24px rgba(255,200,0,0.8)',
                marginBottom: 4
              }}>
                {balance}
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 300,
                fontFamily: 'Inter, sans-serif',
                color: 'rgba(255,255,255,0.95)',
                textShadow: '0 0 8px rgba(255,200,100,0.9), 0 0 16px rgba(255,150,0,0.7)',
                letterSpacing: 1,
                opacity: 0.9
              }}>
                {karmikWord}
              </div>
            </div>
          </div>

          {/* Планеты, вращающиеся вокруг центра */}
          {planets.map((planet, idx) => (
            <div key={idx} style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: planet.orbit * 2,
              height: planet.orbit * 2,
              marginTop: -planet.orbit,
              marginLeft: -planet.orbit,
              animation: `planetOrbit ${planet.speed}s linear infinite`,
              zIndex: 1
            }}>
              {/* Орбита (едва заметный пунктир) */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '100%', height: '100%',
                borderRadius: '50%',
                border: '1px dashed rgba(255,255,255,0.15)',
                boxSizing: 'border-box'
              }} />
              {/* Планета-кнопка */}
              <div
                onClick={() => router.push(planet.path)}
                style={{
                  position: 'absolute',
                  top: -7,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 30% 30%, ${planet.color}, ${planet.shadow})`,
                  boxShadow: `0 0 8px ${planet.color}, 0 0 16px ${planet.shadow}`,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  zIndex: 3
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.width = '20px';
                  e.currentTarget.style.height = '20px';
                  e.currentTarget.style.top = '-10px';
                  e.currentTarget.style.boxShadow = `0 0 16px ${planet.color}, 0 0 32px ${planet.shadow}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.width = '14px';
                  e.currentTarget.style.height = '14px';
                  e.currentTarget.style.top = '-7px';
                  e.currentTarget.style.boxShadow = `0 0 8px ${planet.color}, 0 0 16px ${planet.shadow}`;
                }}
              />
              {/* Название планеты (видно всегда, снаружи орбиты) */}
              <div style={{
                position: 'absolute',
                top: -25,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 10,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.85)',
                whiteSpace: 'nowrap',
                textShadow: '0 0 6px rgba(255,200,100,0.8)',
                pointerEvents: 'none',
                zIndex: 2
              }}>
                {planet.label}
              </div>
            </div>
          ))}
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
        @keyframes starGlow {
          0% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
        }
        @keyframes coreBreath {
          0% { box-shadow: 0 0 25px rgba(255,100,0,0.9), 0 0 50px rgba(255,50,0,0.5); }
          100% { box-shadow: 0 0 40px rgba(255,140,0,1), 0 0 80px rgba(255,80,0,0.7); }
        }
        @keyframes planetOrbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
