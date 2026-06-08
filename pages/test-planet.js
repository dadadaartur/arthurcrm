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

        {/* === НОВЫЙ БЛОК БАЛАНСА — ГОЛОГРАММНОЕ ОБЛАКО === */}
        <div style={{
          position: 'absolute',
          left: '3%',
          top: '4%',
          zIndex: 20,
          width: 280,
          height: 280,
          animation: 'driftBalance 20s ease-in-out infinite alternate'
        }}>
          {/* Слой 1 – медленное цветное пятно */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 180, height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(100,150,255,0.2) 0%, rgba(80,100,200,0.1) 40%, transparent 70%)',
            filter: 'blur(25px)',
            animation: 'cloudShift1 12s ease-in-out infinite alternate'
          }} />
          {/* Слой 2 – золотистое облако */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 200, height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,180,0,0.3) 0%, rgba(255,140,0,0.15) 40%, transparent 70%)',
            filter: 'blur(30px)',
            animation: 'cloudShift2 15s ease-in-out infinite alternate'
          }} />
          {/* Слой 3 – розоватое свечение */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 170, height: 170,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,120,120,0.25) 0%, rgba(200,80,100,0.1) 50%, transparent 70%)',
            filter: 'blur(28px)',
            animation: 'cloudShift3 18s ease-in-out infinite alternate'
          }} />
          {/* Слой 4 – голубое мерцание */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 160, height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(150,200,255,0.3) 0%, rgba(100,150,255,0.1) 50%, transparent 70%)',
            filter: 'blur(35px)',
            animation: 'cloudShift4 20s ease-in-out infinite alternate'
          }} />

          {/* Цифра и подпись */}
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
              fontSize: 44,
              fontWeight: 500,
              fontFamily: 'Inter, sans-serif',
              color: '#ffffff',
              textShadow: '0 0 15px rgba(255,220,150,0.8), 0 0 30px rgba(255,180,80,0.5)',
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
              color: 'rgba(255,255,255,0.9)',
              textShadow: '0 0 8px rgba(255,200,100,0.8), 0 0 16px rgba(255,150,50,0.5)',
              letterSpacing: 2,
              opacity: 0.9
            }}>
              {karmikWord}
            </div>
          </div>

          {/* Кнопки – ряд под облаком */}
          <div style={{
            position: 'absolute',
            bottom: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 24,
            zIndex: 3
          }}>
            {[
              { label: 'Перевести', path: '/transfer' },
              { label: 'Операции', path: '/history' },
              { label: 'Покупки', path: '/my-purchases' },
              { label: 'Магазин', path: '/shop' }
            ].map((btn, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div
                  onClick={() => router.push(btn.path)}
                  style={{
                    fontSize: 12,
                    fontWeight: 400,
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    textShadow: '0 0 5px rgba(255,200,100,0.5)',
                    transition: 'all 0.3s ease',
                    marginBottom: 2
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#FFD700';
                    e.currentTarget.style.textShadow = '0 0 10px rgba(255,200,100,1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                    e.currentTarget.style.textShadow = '0 0 5px rgba(255,200,100,0.5)';
                  }}
                >
                  {btn.label}
                </div>
                <div style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'rgba(255,200,100,0.4)',
                  margin: '0 auto',
                  boxShadow: '0 0 4px rgba(255,200,100,0.4)'
                }} />
              </div>
            ))}
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
          100% { transform: translate(6px, -6px); }
        }
        @keyframes cloudShift1 {
          0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) translate(8px, -5px) scale(1.1); opacity: 1; }
        }
        @keyframes cloudShift2 {
          0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 0.7; }
          100% { transform: translate(-50%, -50%) translate(-6px, 8px) scale(1.15); opacity: 1; }
        }
        @keyframes cloudShift3 {
          0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 0.5; }
          100% { transform: translate(-50%, -50%) translate(-10px, -6px) scale(1.05); opacity: 0.9; }
        }
        @keyframes cloudShift4 {
          0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 0.4; }
          100% { transform: translate(-50%, -50%) translate(6px, 10px) scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </>
  )
}
