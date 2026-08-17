import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'
import { useProfile } from '../context/ProfileContext'
import { isSuperAdmin } from '../lib/permissions'

function getKarmikWord(n) {
  const lastDigit = n % 10
  const lastTwoDigits = n % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'кармиков'
  if (lastDigit === 1) return 'кармик'
  if (lastDigit >= 2 && lastDigit <= 4) return 'кармика'
  return 'кармиков'
}

function CorporateLanding() {
  const router = useRouter()
  const { user } = useProfile()
  return (
    <div className="landing-wrapper min-h-screen bg-black text-white overflow-x-hidden">
      <Head><title>Кармический Банк | Экосистема Роста</title></Head>
      <div className="stars-bg"><div className="gradient-aura" /></div>
      <header className="fixed top-0 w-full z-50 px-8 py-5 flex justify-between items-center backdrop-blur-md">
        <div className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">Кармический банк</div>
        {user ? (
          <button onClick={() => router.push('/')} className="text-sm font-medium text-white/70 hover:text-white transition-colors px-5 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">Вернуться в систему</button>
        ) : (
          <button onClick={() => router.push('/login')} className="text-sm font-medium text-white/70 hover:text-white transition-colors px-5 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">Войти</button>
        )}
      </header>
      <section className="relative pt-32 pb-20 flex flex-col items-center text-center px-4">
        <div className="hero-black-hole mb-12" style={{ position: 'relative', width: 180, height: 180 }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,0,0.4) 0%, rgba(255,100,0,0.2) 30%, transparent 60%)', filter: 'blur(14px)', animation: 'orbitSpin 80s linear infinite' }} />
          <div className="black-hole" style={{ width: 180, height: 180, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tighter leading-tight">
          Управляйте не людьми, <br />
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-600 bg-clip-text text-transparent">а энергией их достижений</span>
        </h1>
        <p className="max-w-2xl text-gray-400 text-lg md:text-xl mb-10">Традиционные премии — это прошлое. «Кармический Банк» — это операционная система для мотивации.</p>
        <div className="flex gap-6"><button onClick={() => router.push('/create-company')} className="btn-gold !text-lg !py-4 !px-12">Создать компанию</button></div>
      </section>
      <footer className="py-10 border-t border-white/5 text-center text-gray-600 text-xs">&copy; {new Date().getFullYear()} Кармический банк.</footer>
      <style jsx>{`
        .hero-black-hole { position: relative; display: flex; justify-content: center; align-items: center; }
        .gradient-aura { position: absolute; bottom: 0; width: 100%; height: 50%; background: radial-gradient(circle at center, rgba(139, 92, 246, 0.1) 0%, transparent 70%); }
        .landing-wrapper { scroll-behavior: smooth; }
        @keyframes orbitSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// =====================================================================
// ПАДАЮЩАЯ ЗВЕЗДА: заострённый тающий хвост + яркая голова со свечением.
// Летит по диагонали в глубине (за чёрной дырой), плавно появляется и гаснет.
// =====================================================================
function ShootingStar({ fly, dur, delay, rotate, scale = 0.8, uid }) {
  return (
    <div style={{
      position: 'absolute', left: 0, top: 0, zIndex: 3, pointerEvents: 'none',
      opacity: 0,
      animation: `${fly} ${dur}s linear ${delay}s infinite`,
    }}>
      <div style={{ transform: `rotate(${rotate}deg) scale(${scale})`, transformOrigin: '0 0', filter: 'blur(0.4px)' }}>
        <svg width="240" height="48" viewBox="0 0 240 48" style={{ overflow: 'visible', display: 'block' }}>
          <defs>
            <linearGradient id={`${uid}-tail`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="rgba(160,200,255,0)" />
              <stop offset="0.55" stopColor="rgba(180,215,255,0.28)" />
              <stop offset="0.85" stopColor="rgba(220,240,255,0.7)" />
              <stop offset="1" stopColor="rgba(255,255,255,0.95)" />
            </linearGradient>
            <radialGradient id={`${uid}-head`}>
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="30%" stopColor="rgba(225,240,255,0.9)" />
              <stop offset="60%" stopColor="rgba(160,210,255,0.35)" />
              <stop offset="100%" stopColor="rgba(140,190,255,0)" />
            </radialGradient>
            <filter id={`${uid}-glow`} x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id={`${uid}-soft`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>
          </defs>
          {/* Широкий мягкий ореол хвоста */}
          <path d="M 12 24 L 172 13 L 232 24 L 172 35 Z" fill={`url(#${uid}-tail)`} opacity="0.3" filter={`url(#${uid}-soft)`} />
          {/* Чёткий заострённый хвост */}
          <path d="M 34 24 L 226 21.2 L 232 24 L 226 26.8 Z" fill={`url(#${uid}-tail)`} />
          {/* Голова */}
          <circle cx="232" cy="24" r="8" fill={`url(#${uid}-head)`} filter={`url(#${uid}-glow)`} />
          <circle cx="232" cy="24" r="2.2" fill="#ffffff" filter={`url(#${uid}-glow)`} />
        </svg>
      </div>
    </div>
  )
}

// ============ ГЛАВНАЯ (v12 — столпы картинкой + падающие звёзды) ============
export default function Home() {
  const { user, profile, loading } = useProfile()
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [pageLoading, setPageLoading] = useState(true)
  const starsRef = useRef(null)
  const nebulaRef = useRef(null)

  const mastery = { title: 'Специалист', stage: 2, stagesTotal: 6, currentEnergy: 2460, nextEnergy: 3200 }
  const stages = ['Новичок', 'Специалист', 'Старший специалист', 'Эксперт', 'Мастер', 'Президент']
  const progressPercent = Math.round((mastery.currentEnergy / mastery.nextEnergy) * 100)
  const energyRemaining = mastery.nextEnergy - mastery.currentEnergy
  const skills = useMemo(() => [
    { name: 'Эффективность', value: 82, color: '#a0e9ff' },
    { name: 'Обучаемость', value: 67, color: '#c084fc' },
    { name: 'Знание продукта', value: 91, color: '#4ade80' },
    { name: 'Коммуникация', value: 74, color: '#ffb3c6' },
    { name: 'Ответственность', value: 85, color: '#FFD700' },
    { name: 'Инициатива', value: 52, color: '#f97316' },
  ], [])

  useEffect(() => {
    if (!user) { setPageLoading(false); return }
    if (!loading && !isSuperAdmin(profile) && (!profile || !profile.company_id)) {
      router.push('/welcome'); return
    }
    const loadData = async () => {
      const { data: bal } = await supabase.from('karma_balance').select('balance').eq('user_id', user.id).single()
      if (bal) setBalance(bal.balance)
      setPageLoading(false)
    }
    loadData()
  }, [user, loading, profile])

  const handleMouseMove = (e) => {
    const x = e.clientX / window.innerWidth - 0.5
    const y = e.clientY / window.innerHeight - 0.5
    if (starsRef.current) starsRef.current.style.transform = `translate(${x * -6}px, ${y * -6}px)`
    if (nebulaRef.current) nebulaRef.current.style.transform = `translate(${x * -14}px, ${y * -14}px)`
  }

  if (loading || pageLoading) return null
  if (!user) return <CorporateLanding />

  const karmikWord = getKarmikWord(balance)
  const centerX = 58
  const centerY = 42

  const blocks = [
    { title: 'Задания', sub: '', left: 58, top: 16, colors: ['#d4af37', '#A3E0B0'] },
    { title: 'Чемпионат', sub: 'менеджеров', left: 77, top: 24, colors: ['#7AC78F', '#c084fc'] },
    { title: 'Магазин', sub: 'награды', left: 85, top: 42, colors: ['#F28B82', '#FFD700'] },
    { title: 'Моя компания', sub: 'данные и новости', left: 77, top: 60, colors: ['#c084fc', '#F28B82'] },
    { title: 'Покупки', sub: 'мои награды', left: 58, top: 68, colors: ['#ffe29f', '#b3f0ff'] },
    { title: 'База знаний', sub: 'лучшие практики', left: 39, top: 60, colors: ['#c084fc', '#7AC78F'] },
    { title: 'План адаптации', sub: 'твой путь', left: 31, top: 42, colors: ['#7AC78F', '#F28B82'] },
    { title: 'Цели', sub: 'твои победы', left: 39, top: 24, colors: ['#A3E0B0', '#d4af37'] },
  ]
  const beams = blocks.map(block => {
    const dx = block.left - centerX
    const dy = block.top - centerY
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    const length = Math.sqrt(dx * dx + dy * dy) * 0.5
    return { angle, length }
  })
  const routes = {
    'Чемпионат': '/leaderboard', 'Моя компания': '/company', 'База знаний': '/knowledge',
    'План адаптации': '/onboarding', 'Цели': '/goals', 'Задания': '/tasks',
    'Магазин': '/shop', 'Покупки': '/my-purchases',
  }

  return (
    <>
      <Head><title>Кармический банк</title></Head>
      <div onMouseMove={handleMouseMove} style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>

        {/* Звёзды */}
        <div ref={starsRef} style={{ position: 'absolute', top: '-2%', left: '-2%', width: '104%', height: '104%', zIndex: 0, transition: 'transform 1.4s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          {Array.from({ length: 180 }).map((_, i) => {
            const size = Math.random() * 2.2 + 0.5
            const colors = ['#ffffff', '#ffe0d0', '#ffddaa', '#d0e0ff', '#ffffdd', '#ffe4c4']
            const color = colors[Math.floor(Math.random() * colors.length)]
            return (
              <div key={i} style={{
                position: 'absolute', left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
                width: size + 'px', height: size + 'px', borderRadius: '50%', background: color,
                boxShadow: `0 0 ${size * 2}px ${color}`,
                opacity: Math.random() * 0.5 + 0.3,
                animation: `twinkle ${Math.random() * 18 + 10}s ease-in-out infinite`,
                animationDelay: Math.random() * 14 + 's',
              }} />
            )
          })}
        </div>

        {/* Туманности-фон */}
        <div ref={nebulaRef} style={{ position: 'absolute', top: '-3%', left: '-3%', width: '106%', height: '106%', zIndex: 1, transition: 'transform 2s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <div style={{ position: 'absolute', top: '18%', left: '-4%', width: '38%', height: '38%', background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.06) 0%, transparent 70%)', filter: 'blur(55px)', animation: 'nebulaDrift1 220s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: '18%', right: '-4%', width: '44%', height: '44%', background: 'radial-gradient(ellipse at center, rgba(255,150,200,0.045) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'nebulaDrift2 260s ease-in-out infinite alternate' }} />
        </div>

        {/* ============ СТОЛПЫ ТВОРЕНИЯ — правый нижний угол ============ */}
        {/* Тёплое свечение позади столпов */}
        <div style={{
          position: 'absolute', right: '-6%', bottom: '-10%', zIndex: 1, pointerEvents: 'none',
          width: '52%', height: '70%',
          background: 'radial-gradient(ellipse at 60% 70%, rgba(200,120,50,0.14) 0%, rgba(120,80,40,0.07) 45%, transparent 75%)',
          filter: 'blur(30px)',
          animation: 'pillarsBreath 22s ease-in-out infinite alternate',
        }} />
        {/* Сама картинка: чёрный растворяется через screen */}
        <div style={{
          position: 'absolute', right: -30, bottom: -24, zIndex: 2, pointerEvents: 'none',
          width: 'min(46vw, 620px)',
          animation: 'pillarsBreath 22s ease-in-out infinite alternate',
        }}>
          <img
            src="/pillars.png"
            alt=""
            onError={(e) => { e.currentTarget.style.display = 'none' }}
            style={{
              width: '100%', display: 'block',
              mixBlendMode: 'screen',
              filter: 'blur(0.5px) saturate(1.15) brightness(1.02)',
              maskImage: 'radial-gradient(ellipse at 55% 60%, black 52%, transparent 96%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 55% 60%, black 52%, transparent 96%)',
            }}
          />
        </div>

        {/* ПАДАЮЩИЕ ЗВЁЗДЫ — в глубине, за чёрной дырой */}
        <ShootingStar fly="starFlyA" dur={58} delay={6} rotate={-32} scale={0.8} uid="ssa" />
        <ShootingStar fly="starFlyB" dur={74} delay={38} rotate={147} scale={0.65} uid="ssb" />

        {/* Мягкие переливы снизу */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 100%, rgba(255,100,50,0.16) 0%, rgba(255,100,50,0.07) 40%, transparent 75%)', filter: 'blur(18px)', animation: 'breathe1 40s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: 0, right: '-8%', width: '115%', height: '100%', background: 'radial-gradient(ellipse at 72% 100%, rgba(130,100,255,0.1) 0%, transparent 70%)', filter: 'blur(24px)', animation: 'breathe3 56s ease-in-out infinite alternate' }} />
        </div>

        {/* Аккреционный диск */}
        <div style={{
          position: 'absolute', left: centerX + '%', top: centerY + '%',
          transform: 'translate(-50%, -50%)',
          width: 560, height: 560, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, transparent, rgba(255,180,0,0.04) 20%, rgba(255,140,0,0.09) 40%, transparent 60%, rgba(139,92,246,0.07) 80%, transparent 100%)',
          filter: 'blur(34px)',
          animation: 'accretionSpin 180s linear infinite',
          pointerEvents: 'none', zIndex: 4,
        }} />

        {/* ЧЁРНАЯ ДЫРА */}
        <div style={{ position: 'absolute', left: centerX + '%', top: centerY + '%', width: 110, height: 110, zIndex: 5, animation: 'holeBreath 30s ease-in-out infinite' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,0,0.45) 0%, rgba(255,100,0,0.2) 30%, transparent 62%)', filter: 'blur(16px)', animation: 'orbitSpin 90s linear infinite' }} />
          <div style={{ position: 'absolute', top: '-6%', left: '-6%', width: '112%', height: '112%', borderRadius: '50%', background: 'radial-gradient(circle at 45% 45%, rgba(255,200,100,0.55) 0%, rgba(200,100,255,0.22) 40%, transparent 70%)', filter: 'blur(10px)', animation: 'orbitSpin 70s linear infinite reverse' }} />
          <div style={{ position: 'absolute', top: '15%', left: '15%', width: '70%', height: '70%', borderRadius: '50%', background: 'radial-gradient(circle, #000 0%, #0a0a0a 40%, transparent 80%)', boxShadow: '0 0 40px rgba(255,215,0,0.5), 0 0 90px rgba(255,180,0,0.28)', filter: 'blur(2px)' }} />
        </div>

        {/* Лучи */}
        {beams.map((beam, idx) => (
          <div key={`beam-${idx}`} style={{
            position: 'absolute', left: centerX + '%', top: centerY + '%',
            width: beam.length + '%', height: '1px',
            background: 'linear-gradient(90deg, rgba(255,200,50,0) 0%, rgba(255,180,0,0.16) 30%, rgba(255,140,0,0.28) 60%, transparent 100%)',
            transform: `rotate(${beam.angle}deg)`, transformOrigin: '0 0',
            filter: 'blur(3px)',
            animation: `beamPulse ${14 + idx % 3}s ease-in-out infinite alternate ${idx * 0.8}s`,
            pointerEvents: 'none', zIndex: 6,
          }} />
        ))}

        {/* 8 КНОПОК */}
        {blocks.map((block, idx) => {
          const [c1, c2] = block.colors
          const dx = block.left - centerX
          const dy = block.top - centerY
          const len = Math.sqrt(dx * dx + dy * dy) || 1
          const ux = dx / len
          const uy = dy / len
          const handleClick = () => { const p = routes[block.title]; if (p) router.push(p) }
          return (
            <div key={idx} style={{
              position: 'absolute', left: block.left + '%', top: block.top + '%',
              zIndex: 10, '--ux': ux, '--uy': uy,
              animation: 'gravBreath 30s ease-in-out infinite',
            }}>
              <div style={{ animation: `drift${idx % 3} ${130 + idx * 6}s ease-in-out infinite alternate` }}>
                <div
                  onClick={handleClick}
                  style={{
                    transform: 'translate(-50%, -50%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1), filter 0.7s ease',
                    willChange: 'transform',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.18)'
                    e.currentTarget.style.filter = `drop-shadow(0 0 24px ${c1}) drop-shadow(0 0 8px ${c2})`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'
                    e.currentTarget.style.filter = 'none'
                  }}
                >
                  <div style={{
                    fontSize: 16, fontWeight: 600, lineHeight: 1.2, marginBottom: 4,
                    background: `linear-gradient(135deg, ${c1}, ${c2})`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 10px rgba(192,132,252,0.6))',
                    textAlign: 'center', whiteSpace: 'nowrap',
                  }}>{block.title}</div>
                  {block.sub && (
                    <div style={{
                      fontSize: 13, fontWeight: 400, color: '#eaf0fb',
                      filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.5))', opacity: 0.85, textAlign: 'center', whiteSpace: 'nowrap',
                    }}>{block.sub}</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* === БЛОК БАЛАНСА === */}
        <div style={{
          position: 'absolute', left: '2.5%', top: 10, zIndex: 20,
          animation: 'driftBalance 55s ease-in-out infinite alternate',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          minWidth: 340, padding: '14px 40px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 300, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textShadow: '0 0 8px rgba(160,233,255,0.6)', marginBottom: 8 }}>Баланс</div>
          <div style={{ fontSize: 58, fontWeight: 600, lineHeight: 1, background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6, #ffe29f, #b3f0ff)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 14px rgba(100,200,255,0.9)) drop-shadow(0 0 28px rgba(255,150,200,0.6))', animation: 'rainbowShift 12s ease-in-out infinite alternate', marginBottom: 6 }}>{balance}</div>
          <div style={{ fontSize: 12, fontWeight: 300, color: 'rgba(255,255,255,0.85)', textShadow: '0 0 8px rgba(100,200,255,0.7)', letterSpacing: 2, marginBottom: 20 }}>{karmikWord}</div>
          <div style={{ width: '70%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent)', marginBottom: 18 }} />
          <div style={{ display: 'flex', gap: 56, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            {[
              { label: 'Перевести', path: '/transfer', color: '#a0e9ff' },
              { label: 'Операции', path: '/history', color: '#ffb3c6' },
            ].map((btn, idx) => (
              <div key={idx} style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)' }}
                onClick={() => router.push(btn.path)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.18)'
                  e.currentTarget.firstChild.style.color = btn.color
                  e.currentTarget.firstChild.style.textShadow = `0 0 14px ${btn.color}`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.firstChild.style.color = 'rgba(255,255,255,0.6)'
                  e.currentTarget.firstChild.style.textShadow = '0 0 6px rgba(100,200,255,0.4)'
                }}>
                <div style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.6)', textShadow: '0 0 6px rgba(100,200,255,0.4)', transition: 'all 0.5s ease', marginBottom: 5 }}>{btn.label}</div>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: btn.color, margin: '0 auto', boxShadow: `0 0 6px ${btn.color}` }} />
              </div>
            ))}
          </div>
        </div>

        {/* === КАРМИЧЕСКАЯ ЭНЕРГИЯ === */}
        <div style={{
          position: 'absolute', left: '2.5%', top: 250, zIndex: 20,
          animation: 'driftGoals 60s ease-in-out infinite alternate',
          width: 340, padding: '0 40px', boxSizing: 'border-box',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 300, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', textShadow: '0 0 6px rgba(192,132,252,0.4)', marginBottom: 4 }}>Уровень мастерства</div>
            <div style={{ fontSize: 22, fontWeight: 600, background: 'linear-gradient(135deg, #c084fc, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(192,132,252,0.7))', marginBottom: 3 }}>{mastery.title}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textShadow: '0 0 6px rgba(192,132,252,0.5)', letterSpacing: 1 }}>Этап {mastery.stage} из {mastery.stagesTotal}</div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 300, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', textShadow: '0 0 6px rgba(255,215,0,0.4)', marginBottom: 4 }}>Кармическая энергия</div>
            <div style={{
              fontSize: 26, fontWeight: 600,
              background: 'linear-gradient(135deg, #FFD700, #ffb3c6, #a0e9ff)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.7))',
              animation: 'rainbowShift 14s ease-in-out infinite alternate',
              marginBottom: 3,
            }}>{mastery.currentEnergy.toLocaleString('ru')}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textShadow: '0 0 5px rgba(255,215,0,0.4)' }}>
              До «{stages[mastery.stage]}»: {energyRemaining.toLocaleString('ru')} энергии
            </div>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 16, marginTop: 10 }}>
            <div style={{ height: '100%', width: progressPercent + '%', background: 'linear-gradient(90deg, #c084fc, #FFD700)', borderRadius: 2, boxShadow: '0 0 8px rgba(255,215,0,0.6)', animation: 'progressPulse 6s ease-in-out infinite' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {skills.map((skill, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textShadow: '0 0 6px rgba(255,255,255,0.3)', fontWeight: 500 }}>{skill.name}</span>
                  <span style={{ fontSize: 11, color: skill.color, textShadow: `0 0 6px ${skill.color}`, fontWeight: 600 }}>{skill.value}%</span>
                </div>
                <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: skill.value + '%', background: `linear-gradient(90deg, ${skill.color}40, ${skill.color})`, borderRadius: 2, boxShadow: `0 0 6px ${skill.color}`, animation: `skillGrow${idx} 2.8s ease-out forwards` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.95); } 50% { opacity: 0.9; transform: scale(1.05); } }
        @keyframes orbitSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes accretionSpin { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes beamPulse { 0% { opacity: 0.15; } 100% { opacity: 0.4; } }
        @keyframes drift0 { 0% { transform: translateX(-5px) translateY(3px); } 100% { transform: translateX(5px) translateY(-3px); } }
        @keyframes drift1 { 0% { transform: translateX(4px) translateY(-4px); } 100% { transform: translateX(-4px) translateY(4px); } }
        @keyframes drift2 { 0% { transform: translateX(-4px) translateY(-3px); } 100% { transform: translateX(4px) translateY(3px); } }
        @keyframes driftBalance { 0% { transform: translate(0, 0); } 100% { transform: translate(3px, -3px); } }
        @keyframes driftGoals { 0% { transform: translate(0, 0); } 100% { transform: translate(-2px, 4px); } }
        @keyframes rainbowShift { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
        @keyframes progressPulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
        @keyframes breathe1 { 0% { opacity: 0.6; transform: scaleY(1); } 100% { opacity: 1; transform: scaleY(1.08); } }
        @keyframes breathe3 { 0% { opacity: 0.4; transform: scaleY(1.05) translateX(1%); } 100% { opacity: 0.8; transform: scaleY(1.15) translateX(-1%); } }
        @keyframes holeBreath {
          0%, 100% { transform: translate(-50%, -50%) scale(0.93); }
          50% { transform: translate(-50%, -50%) scale(1.12); }
        }
        @keyframes gravBreath {
          0%, 100% { transform: translate(calc(var(--ux) * 12px), calc(var(--uy) * 12px)); }
          50% { transform: translate(calc(var(--ux) * -18px), calc(var(--uy) * -18px)); }
        }
        @keyframes nebulaDrift1 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(6%,3%) scale(1.05); } }
        @keyframes nebulaDrift2 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-5%,-4%) scale(1.07); } }
        /* Столпы: медленное дыхание света */
        @keyframes pillarsBreath { 0% { opacity: 0.75; } 100% { opacity: 1; } }
        /* Падающая звезда А: слева-снизу направо-вверх, за дырой */
        @keyframes starFlyA {
          0% { transform: translate(-14vw, 74vh); opacity: 0; }
          3% { opacity: 0.85; }
          14% { transform: translate(46vw, 37vh); opacity: 0.85; }
          18% { transform: translate(55vw, 31vh); opacity: 0; }
          100% { transform: translate(55vw, 31vh); opacity: 0; }
        }
        /* Падающая звезда Б: справа-сверху налево-вниз */
        @keyframes starFlyB {
          0% { transform: translate(108vw, 20vh); opacity: 0; }
          3% { opacity: 0.75; }
          15% { transform: translate(52vw, 56vh); opacity: 0.75; }
          19% { transform: translate(43vw, 62vh); opacity: 0; }
          100% { transform: translate(43vw, 62vh); opacity: 0; }
        }
        @keyframes skillGrow0 { from { width: 0; } to { width: 82%; } }
        @keyframes skillGrow1 { from { width: 0; } to { width: 67%; } }
        @keyframes skillGrow2 { from { width: 0; } to { width: 91%; } }
        @keyframes skillGrow3 { from { width: 0; } to { width: 74%; } }
        @keyframes skillGrow4 { from { width: 0; } to { width: 85%; } }
        @keyframes skillGrow5 { from { width: 0; } to { width: 52%; } }
      `}</style>
    </>
  )
}
