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

        {/* === БЛОК БАЛАНСА — ЭНЕРГЕТИЧЕСКАЯ ВЯЗЬ === */}
        <div style={{
          position: 'absolute',
          left: '4%',
          top: '4%',
          zIndex: 20,
          width: 360,
          height: 360,
          animation: 'driftBalance 15s ease-in-out infinite alternate'
        }}>
          {/* SVG с нитями */}
          <svg width="360" height="360" viewBox="0 0 360 360" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
            <defs>
              <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#FFA500" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#B87333" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="copper" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#B87333" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#D2691E" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#FFA500" stopOpacity="0.2" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
              </filter>
            </defs>

            {/* Группа нитей, вращающаяся медленно */}
            <g style={{ animation: 'weaveRotate1 20s linear infinite', transformOrigin: '180px 180px' }}>
              <path d="M180 100 C 120 80, 60 150, 100 200 C 140 250, 200 220, 220 180 C 240 140, 200 110, 180 120" 
                    fill="none" stroke="url(#gold)" strokeWidth="1.5" filter="url(#glow)"
                    style={{ animation: 'weaveDash 3s ease-in-out infinite alternate' }} />
              <path d="M180 260 C 240 280, 300 210, 260 160 C 220 110, 160 140, 140 180 C 120 220, 160 250, 180 240" 
                    fill="none" stroke="url(#copper)" strokeWidth="1.2" filter="url(#glow)"
                    style={{ animation: 'weaveDash 4s ease-in-out infinite alternate-reverse' }} />
            </g>

            {/* Вторая группа нитей, вращающаяся в другую сторону */}
            <g style={{ animation: 'weaveRotate2 25s linear infinite', transformOrigin: '180px 180px' }}>
              <path d="M120 180 C 100 120, 150 70, 200 90 C 250 110, 260 160, 230 190 C 200 220, 160 210, 140 190" 
                    fill="none" stroke="url(#gold)" strokeWidth="1.4" filter="url(#softGlow)"
                    style={{ animation: 'weaveDash 5s ease-in-out infinite alternate' }} />
              <path d="M240 180 C 260 240, 210 290, 160 270 C 110 250, 100 200, 130 170 C 160 140, 200 150, 220 170" 
                    fill="none" stroke="url(#copper)" strokeWidth="1.3" filter="url(#softGlow)"
                    style={{ animation: 'weaveDash 3.5s ease-in-out infinite alternate-reverse' }} />
            </g>

            {/* Третья группа нитей (дополнительная сложность) */}
            <g style={{ animation: 'weaveRotate3 30s linear infinite', transformOrigin: '180px 180px' }}>
              <path d="M140 140 C 100 100, 150 50, 200 80 C 250 110, 250 160, 210 180 C 170 200, 130 170, 150 150" 
                    fill="none" stroke="url(#gold)" strokeWidth="1" filter="url(#glow)"
                    style={{ animation: 'weaveDash 4.5s ease-in-out infinite alternate' }} />
              <path d="M220 220 C 260 260, 210 310, 160 280 C 110 250, 110 200, 150 180 C 190 160, 230 190, 210 210" 
                    fill="none" stroke="url(#copper)" strokeWidth="1.1" filter="url(#glow)"
                    style={{ animation: 'weaveDash 3.8s ease-in-out infinite alternate-reverse' }} />
            </g>
          </svg>

          {/* Центральная звезда-цифра */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            zIndex: 2,
            pointerEvents: 'none'
          }}>
            <div style={{
              fontSize: 46,
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              color: '#FFD700',
              textShadow: '0 0 20px rgba(255,200,0,0.9), 0 0 40px rgba(255,140,0,0.6)',
              letterSpacing: 2,
              lineHeight: 1,
              marginBottom: 6
            }}>
              {balance}
            </div>
            <div style={{
              fontSize: 12,
              fontWeight: 300,
              fontFamily: 'Inter, sans-serif',
              color: 'rgba(255,255,255,0.95)',
              textShadow: '0 0 10px rgba(255,200,100,0.9), 0 0 20px rgba(255,150,0,0.7)',
              letterSpacing: 2,
              opacity: 0.9
            }}>
              {karmikWord}
            </div>
          </div>

          {/* Узелки-кнопки */}
          {[
            { label: 'Перевести', path: '/transfer', x: 90, y: 60 },
            { label: 'Операции', path: '/history', x: 270, y: 60 },
            { label: 'Покупки', path: '/my-purchases', x: 90, y: 300 },
            { label: 'Магазин', path: '/shop', x: 270, y: 300 }
          ].map((btn, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: btn.x,
              top: btn.y,
              transform: 'translate(-50%, -50%)',
              zIndex: 3,
              cursor: 'pointer'
            }}>
              <div
                onClick={() => router.push(btn.path)}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #FFD700, #B87333)',
                  boxShadow: '0 0 10px #FFD700, 0 0 20px #FFA500',
                  transition: 'all 0.3s ease',
                  margin: '0 auto'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.width = '18px';
                  e.currentTarget.style.height = '18px';
                  e.currentTarget.style.boxShadow = '0 0 18px #FFD700, 0 0 36px #FFA500';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.width = '12px';
                  e.currentTarget.style.height = '12px';
                  e.currentTarget.style.boxShadow = '0 0 10px #FFD700, 0 0 20px #FFA500';
                }}
              />
              <div style={{
                marginTop: 8,
                fontSize: 11,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.8)',
                textShadow: '0 0 6px rgba(255,200,100,0.7)',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                transition: 'all 0.3s ease',
              }}>
                {btn.label}
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
        @keyframes weaveRotate1 {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes weaveRotate2 {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
        @keyframes weaveRotate3 {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes weaveDash {
          0% { stroke-dashoffset: 0; stroke-dasharray: 200 200; }
          100% { stroke-dashoffset: -400; stroke-dasharray: 200 200; }
        }
      `}</style>
    </>
  )
}
