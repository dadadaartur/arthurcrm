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

// ============ ЛЕНДИНГ (без изменений) ============
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
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,0,0.4) 0%, rgba(255,100,0,0.2) 30%, transparent 60%)', filter: 'blur(14px)', animation: 'orbitSpin 10s linear infinite' }} />
          <div className="black-hole" style={{ width: 180, height: 180, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tighter leading-tight">
          Управляйте не людьми, <br />
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-600 bg-clip-text text-transparent">а энергией их достижений</span>
        </h1>
        <p className="max-w-2xl text-gray-400 text-lg md:text-xl mb-10">Традиционные премии — это прошлое. «Кармический Банк» — это операционная система для мотивации, которая превращает ежедневную рутину в азартную гонку за результатом.</p>
        <div className="flex gap-6"><button onClick={() => router.push('/create-company')} className="btn-gold !text-lg !py-4 !px-12 animate-pulse">Создать компанию</button></div>
      </section>
      <footer className="py-10 border-t border-white/5 text-center text-gray-600 text-xs">&copy; {new Date().getFullYear()} Кармический банк.</footer>
      <style jsx>{`
        .hero-black-hole { position: relative; display: flex; justify-content: center; align-items: center; }
        .gradient-aura { position: absolute; bottom: 0; width: 100%; height: 50%; background: radial-gradient(circle at center, rgba(139, 92, 246, 0.1) 0%, transparent 70%); }
        @keyframes orbitSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ============ ДАЛЬНИЕ МЕТЕОРЫ (редкие, деликатные, в разных местах) ============
function DistantMeteors() {
  const meteors = useMemo(() => [
    { left: '6%', top: '14%', dist: 260, dur: 19, delay: 4, len: 110, fx: 1, fy: 0.45 },
    { left: '72%', top: '6%', dist: 300, dur: 27, delay: 12, len: 130, fx: -1, fy: 0.5 },
    { left: '88%', top: '58%', dist: 260, dur: 23, delay: 18, len: 100, fx: -1, fy: -0.4 },
    { left: '16%', top: '74%', dist: 300, dur: 31, delay: 25, len: 120, fx: 1, fy: -0.35 },
  ], [])
  return (
    <>
      {meteors.map((m, i) => {
        const rot = Math.atan2(m.fy, m.fx) * 180 / Math.PI
        return (
          <div key={i} style={{
            position: 'absolute', left: m.left, top: m.top,
            width: m.len + 'px', height: '1.5px',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.85), rgba(160,233,255,0.4), transparent)',
            borderRadius: 2,
            transformOrigin: 'left center',
            opacity: 0,
            filter: 'blur(0.4px) drop-shadow(0 0 4px rgba(160,233,255,0.5))',
            '--rot': rot + 'deg', '--dist': m.dist + 'px',
            animation: `meteorFar ${m.dur}s linear ${m.delay}s infinite`,
            pointerEvents: 'none', zIndex: 3,
          }} />
        )
      })}
    </>
  )
}

// ============ СВЕРХНОВАЯ (неожиданный кинематографичный взрыв вдали) ============
function Supernova({ left, top, delay, duration, tint }) {
  const particles = useMemo(() => Array.from({ length: 8 }).map((_, i) => {
    const a = (i / 8) * Math.PI * 2
    const d = 44 + (i % 3) * 16
    return { id: i, sx: Math.cos(a) * d, sy: Math.sin(a) * d, size: 1.5 + (i % 3) }
  }), [])
  return (
    <div style={{ position: 'absolute', left, top, zIndex: 2, pointerEvents: 'none', width: 0, height: 0 }}>
      {/* ядро вспышки */}
      <div style={{
        position: 'absolute', left: -32, top: -32, width: 64, height: 64, borderRadius: '50%',
        background: `radial-gradient(circle, #ffffff 0%, ${tint} 35%, transparent 72%)`,
        filter: 'blur(2px)',
        animation: `snCore ${duration}s ease-in-out ${delay}s infinite`,
      }} />
      {/* ударное кольцо */}
      <div style={{
        position: 'absolute', left: -42, top: -42, width: 84, height: 84, borderRadius: '50%',
        border: `1px solid ${tint}`,
        boxShadow: `0 0 14px ${tint}, inset 0 0 8px ${tint}55`,
        animation: `snRing ${duration}s ease-out ${delay}s infinite`,
      }} />
      {/* разлетающиеся частицы */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', width: p.size + 'px', height: p.size + 'px', borderRadius: '50%',
          background: '#fff', boxShadow: `0 0 6px ${tint}`,
          '--sx': p.sx + 'px', '--sy': p.sy + 'px',
          animation: `snParticle ${duration}s ease-out ${delay}s infinite`,
        }} />
      ))}
    </div>
  )
}

// ============ ГЛАВНАЯ (v4 — кинематографичная экосистема) ============
export default function Home() {
  const { user, profile, loading } = useProfile()
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [pageLoading, setPageLoading] = useState(true)
  const starsRef = useRef(null)
  const nebulaRef = useRef(null)

  // Уровень мастерства (без XP и рангов — этапы)
  const [skills] = useState([
    { name: 'Эффективность', value: 82, max: 100, color: '#a0e9ff' },
    { name: 'Обучаемость', value: 67, max: 100, color: '#c084fc' },
    { name: 'Знание продукта', value: 91, max: 100, color: '#4ade80' },
    { name: 'Коммуникация', value: 74, max: 100, color: '#ffb3c6' },
    { name: 'Ответственность', value: 85, max: 100, color: '#FFD700' },
    { name: 'Инициатива', value: 52, max: 100, color: '#f97316' },
  ])
  const mastery = { title: 'Специалист', stage: 2, stagesTotal: 6, current: 2460, next: 3200 }
  const stages = ['Новичок', 'Специалист', 'Старший специалист', 'Эксперт', 'Мастер', 'Президент']
  const progressPercent = Math.round((mastery.current / mastery.next) * 100)
  const masteryRemaining = mastery.next - mastery.current

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

  // Лёгкий параллакс — космос реагирует на движение мыши
  const handleMouseMove = (e) => {
    const x = e.clientX / window.innerWidth - 0.5
    const y = e.clientY / window.innerHeight - 0.5
    if (starsRef.current) starsRef.current.style.transform = `translate(${x * -10}px, ${y * -10}px)`
    if (nebulaRef.current) nebulaRef.current.style.transform = `translate(${x * -22}px, ${y * -22}px)`
  }

  if (loading || pageLoading) return null
  if (!user) return <CorporateLanding />

  const karmikWord = getKarmikWord(balance)
  const centerX = 58
  const centerY = 42

  // БОЕВЫЕ названия меню — как в боевой главной
  const blocks = [
    { title: 'Чемпионат', sub: 'менеджеров', left: 80, top: 40, colors: ['#7AC78F', '#c084fc'] },
    { title: 'Гороскоп', sub: 'профессий', left: 67.5, top: 61.7, colors: ['#c084fc', '#F28B82'] },
    { title: 'Журнал ПРО', sub: 'лучшие практики', left: 42.5, top: 61.7, colors: ['#c084fc', '#7AC78F'] },
    { title: 'Квиз', sub: 'проверь себя', left: 35, top: 35, colors: ['#7AC78F', '#F28B82'] },
    { title: 'ИИ‑питомец', sub: 'учи и развивай', left: 42.5, top: 18.3, colors: ['#A3E0B0', '#d4af37'] },
    { title: 'Задания', sub: '', left: 67.5, top: 18.3, colors: ['#d4af37', '#A3E0B0'] }
  ]
  const beams = blocks.map(block => {
    const dx = block.left - centerX
    const dy = block.top - centerY
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    const length = Math.sqrt(dx * dx + dy * dy) * 0.5
    return { angle, length }
  })

  return (
    <>
      <Head><title>Кармический банк</title></Head>
      <div onMouseMove={handleMouseMove} style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>

        {/* Звёзды (параллакс-слой) */}
        <div ref={starsRef} style={{ position: 'absolute', top: '-2%', left: '-2%', width: '104%', height: '104%', zIndex: 0, transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          {Array.from({ length: 170 }).map((_, i) => {
            const size = Math.random() * 2.6 + 0.5
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

        {/* Туманности (параллакс-слой, глубже) */}
        <div ref={nebulaRef} style={{ position: 'absolute', top: '-3%', left: '-3%', width: '106%', height: '106%', zIndex: 1, transition: 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <div style={{ position: 'absolute', top: '12%', left: '-8%', width: '42%', height: '42%', background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.09) 0%, transparent 70%)', filter: 'blur(42px)', animation: 'nebulaDrift1 44s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: '8%', right: '-8%', width: '50%', height: '50%', background: 'radial-gradient(ellipse at center, rgba(255,150,200,0.07) 0%, transparent 70%)', filter: 'blur(46px)', animation: 'nebulaDrift2 56s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', top: '48%', left: '30%', width: '32%', height: '32%', background: 'radial-gradient(ellipse at center, rgba(160,233,255,0.06) 0%, transparent 70%)', filter: 'blur(50px)', animation: 'nebulaDrift3 38s ease-in-out infinite alternate' }} />
        </div>

        {/* Мягкие переливы внизу */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
          <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 100%, rgba(255,100,50,0.5) 0%, rgba(255,100,50,0.2) 40%, transparent 75%)', animation: 'breathe1 12s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: 0, left: '-10%', width: '120%', height: '100%', background: 'radial-gradient(ellipse at 30% 100%, rgba(255,100,150,0.25) 0%, transparent 70%)', filter: 'blur(8px)', animation: 'breathe2 16s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: 0, right: '-10%', width: '120%', height: '100%', background: 'radial-gradient(ellipse at 70% 100%, rgba(130,100,255,0.4) 0%, transparent 70%)', filter: 'blur(10px)', animation: 'breathe3 20s ease-in-out infinite alternate' }} />
        </div>

        {/* Жизнь космоса: дальние метеоры и сверхновые */}
        <DistantMeteors />
        <Supernova left="10%" top="20%" delay={6} duration={47} tint="#a0e9ff" />
        <Supernova left="88%" top="72%" delay={29} duration={61} tint="#ffb3c6" />

        {/* Аккреционный диск вокруг дыры */}
        <div style={{
          position: 'absolute', left: centerX + '%', top: centerY + '%',
          transform: 'translate(-50%, -50%)',
          width: 560, height: 560, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, transparent, rgba(255,180,0,0.06) 20%, rgba(255,140,0,0.12) 40%, transparent 60%, rgba(139,92,246,0.09) 80%, transparent 100%)',
          filter: 'blur(28px)',
          animation: 'accretionSpin 32s linear infinite',
          pointerEvents: 'none', zIndex: 4,
        }} />

        {/* ЧЁРНАЯ ДЫРА (крупнее + дыхание, синхронное с гравитацией кнопок) */}
        <div style={{ position: 'absolute', left: centerX + '%', top: centerY + '%', width: 116, height: 116, zIndex: 5, animation: 'holeBreath 7s ease-in-out infinite' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,0,0.45) 0%, rgba(255,100,0,0.22) 30%, transparent 62%)', filter: 'blur(16px)', animation: 'orbitSpin 10s linear infinite' }} />
          <div style={{ position: 'absolute', top: '-6%', left: '-6%', width: '112%', height: '112%', borderRadius: '50%', background: 'radial-gradient(circle at 45% 45%, rgba(255,200,100,0.55) 0%, rgba(200,100,255,0.22) 40%, transparent 70%)', filter: 'blur(10px)', animation: 'orbitSpin 8s linear infinite reverse' }} />
          <div style={{ position: 'absolute', top: '15%', left: '15%', width: '70%', height: '70%', borderRadius: '50%', background: 'radial-gradient(circle, #000 0%, #0a0a0a 40%, transparent 80%)', boxShadow: '0 0 40px rgba(255,215,0,0.5), 0 0 90px rgba(255,180,0,0.28)', filter: 'blur(2px)' }} />
        </div>

        {/* Лучи-рукава */}
        {beams.map((beam, idx) => (
          <div key={`beam-${idx}`} style={{
            position: 'absolute', left: centerX + '%', top: centerY + '%',
            width: beam.length + '%', height: '1px',
            background: 'linear-gradient(90deg, rgba(255,200,50,0) 0%, rgba(255,180,0,0.2) 30%, rgba(255,140,0,0.35) 60%, transparent 100%)',
            transform: `rotate(${beam.angle}deg)`, transformOrigin: '0 0',
            filter: 'blur(3px)', animation: `beamPulse ${4 + idx % 3}s ease-in-out infinite alternate ${idx * 0.3}s`,
            pointerEvents: 'none', zIndex: 6
          }} />
        ))}

        {/* ОРБИТАЛЬНЫЕ КНОПКИ: гравитация (внешний) → дрейф (средний) → hover (внутренний) */}
        {blocks.map((block, idx) => {
          const [c1, c2] = block.colors
          const dx = block.left - centerX
          const dy = block.top - centerY
          const len = Math.sqrt(dx * dx + dy * dy) || 1
          const ux = dx / len
          const uy = dy / len
          const handleClick = () => { if (block.title === 'Задания') router.push('/tasks') }
          return (
            <div key={idx} style={{
              position: 'absolute', left: block.left + '%', top: block.top + '%',
              zIndex: 10,
              '--ux': ux, '--uy': uy,
              animation: 'gravBreath 7s ease-in-out infinite',
            }}>
              <div style={{ animation: `drift${idx % 3} ${8 + idx * 2}s ease-in-out infinite alternate` }}>
                <div
                  onClick={handleClick}
                  style={{
                    transform: 'translate(-50%, -50%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), filter 0.45s ease',
                    willChange: 'transform',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.14)'
                    e.currentTarget.style.filter = `drop-shadow(0 0 20px ${c1}cc)`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'
                    e.currentTarget.style.filter = 'none'
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.2, marginBottom: 4, background: `linear-gradient(135deg, ${c1}, ${c2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(192,132,252,0.6))', textAlign: 'center' }}>{block.title}</div>
                  <div style={{ fontSize: 13, fontWeight: 400, color: '#eaf0fb', filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.5))', opacity: 0.85, textAlign: 'center' }}>{block.sub}</div>
                </div>
              </div>
            </div>
          )
        })}

        {/* === БАЛАНС (парящий) === */}
        <div style={{ position: 'absolute', left: '3%', top: '4%', zIndex: 20, animation: 'driftBalance 25s ease-in-out infinite alternate', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 300, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', textShadow: '0 0 8px rgba(160,233,255,0.6)', marginBottom: 6 }}>Баланс</div>
          <div style={{ fontSize: 52, fontWeight: 600, lineHeight: 1, background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6, #ffe29f, #b3f0ff)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 14px rgba(100,200,255,0.9)) drop-shadow(0 0 28px rgba(255,150,200,0.6))', animation: 'rainbowShift 4s ease-in-out infinite alternate', marginBottom: 4 }}>{balance}</div>
          <div style={{ fontSize: 12, fontWeight: 300, color: 'rgba(255,255,255,0.8)', textShadow: '0 0 8px rgba(100,200,255,0.7)', letterSpacing: 2, marginBottom: 16 }}>{karmikWord}</div>
          <div style={{ width: 70, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent)', marginBottom: 14 }} />
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            {[
              { label: 'История операций', path: '/history', color: '#ffb3c6' },
              { label: 'Перевести', path: '/transfer', color: '#a0e9ff' },
            ].map((btn, idx) => (
              <div key={idx} style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)' }}
                onClick={() => router.push(btn.path)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.15)'
                  e.currentTarget.firstChild.style.color = btn.color
                  e.currentTarget.firstChild.style.textShadow = `0 0 14px ${btn.color}`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.firstChild.style.color = 'rgba(255,255,255,0.6)'
                  e.currentTarget.firstChild.style.textShadow = '0 0 6px rgba(100,200,255,0.4)'
                }}>
                <div style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.6)', textShadow: '0 0 6px rgba(100,200,255,0.4)', transition: 'all 0.3s ease', marginBottom: 5 }}>{btn.label}</div>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: btn.color, margin: '0 auto', boxShadow: `0 0 6px ${btn.color}` }} />
              </div>
            ))}
          </div>
        </div>

        {/* === УРОВЕНЬ МАСТЕРСТВА (парящий, этапы вместо рангов) === */}
        <div style={{ position: 'absolute', left: '3%', top: 250, zIndex: 20, animation: 'driftGoals 22s ease-in-out infinite alternate', width: 250 }}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 600, background: 'linear-gradient(135deg, #c084fc, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(192,132,252,0.7))', marginBottom: 3 }}>{mastery.title}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textShadow: '0 0 6px rgba(192,132,252,0.5)', letterSpacing: 1 }}>Этап {mastery.stage} из {mastery.stagesTotal}</div>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ height: '100%', width: progressPercent + '%', background: 'linear-gradient(90deg, #c084fc, #FFD700)', borderRadius: 2, boxShadow: '0 0 8px rgba(255,215,0,0.6)', animation: 'progressPulse 3s ease-in-out infinite' }} />
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textShadow: '0 0 5px rgba(192,132,252,0.4)', textAlign: 'center', marginBottom: 4 }}>
            До «{stages[mastery.stage]}»: {masteryRemaining} мастерства
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 18 }}>
            Уровень мастерства: {mastery.current.toLocaleString('ru')} / {mastery.next.toLocaleString('ru')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {skills.map((skill, idx) => {
              const percent = Math.round((skill.value / skill.max) * 100)
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textShadow: '0 0 6px rgba(255,255,255,0.3)', fontWeight: 500 }}>{skill.name}</span>
                    <span style={{ fontSize: 11, color: skill.color, textShadow: `0 0 6px ${skill.color}`, fontWeight: 600 }}>{percent}%</span>
                  </div>
                  <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: percent + '%', background: `linear-gradient(90deg, ${skill.color}40, ${skill.color})`, borderRadius: 2, boxShadow: `0 0 6px ${skill.color}`, animation: `skillGrow${idx} 2s ease-out forwards` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.95); } 50% { opacity: 0.7; transform: scale(1.05); } }
        @keyframes breathe1 { 0% { opacity: 0.7; transform: scaleY(1); } 100% { opacity: 1; transform: scaleY(1.15); } }
        @keyframes breathe2 { 0% { opacity: 0.5; transform: scaleY(1.05) translateX(-2%); } 100% { opacity: 0.9; transform: scaleY(1.25) translateX(2%); } }
        @keyframes breathe3 { 0% { opacity: 0.4; transform: scaleY(1.1) translateX(2%); } 100% { opacity: 0.8; transform: scaleY(1.3) translateX(-2%); } }
        @keyframes orbitSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes accretionSpin { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes beamPulse { 0% { opacity: 0.2; } 100% { opacity: 0.55; } }
        @keyframes drift0 { 0% { transform: translateX(-8px) translateY(4px); } 100% { transform: translateX(8px) translateY(-4px); } }
        @keyframes drift1 { 0% { transform: translateX(6px) translateY(-6px); } 100% { transform: translateX(-6px) translateY(6px); } }
        @keyframes drift2 { 0% { transform: translateX(-7px) translateY(-5px); } 100% { transform: translateX(7px) translateY(5px); } }
        @keyframes driftBalance { 0% { transform: translate(0, 0); } 100% { transform: translate(5px, -5px); } }
        @keyframes driftGoals { 0% { transform: translate(0, 0); } 100% { transform: translate(-4px, 6px); } }
        @keyframes rainbowShift { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
        @keyframes progressPulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
        /* Дыхание дыры и гравитация кнопок — один цикл 7s */
        @keyframes holeBreath {
          0%, 100% { transform: translate(-50%, -50%) scale(0.94); }
          50% { transform: translate(-50%, -50%) scale(1.16); }
        }
        @keyframes gravBreath {
          0%, 100% { transform: translate(calc(var(--ux) * 12px), calc(var(--uy) * 12px)); }
          50% { transform: translate(calc(var(--ux) * -20px), calc(var(--uy) * -20px)); }
        }
        /* Дальние метеоры: летят лишь малую долю цикла */
        @keyframes meteorFar {
          0% { opacity: 0; transform: rotate(var(--rot)) translateX(0); }
          2% { opacity: 0.55; }
          9% { opacity: 0; transform: rotate(var(--rot)) translateX(var(--dist)); }
          100% { opacity: 0; transform: rotate(var(--rot)) translateX(var(--dist)); }
        }
        /* Сверхновая */
        @keyframes snCore {
          0%, 84% { opacity: 0; transform: scale(0); }
          86% { opacity: 0.9; transform: scale(0.25); }
          90% { opacity: 0.8; transform: scale(1); }
          96%, 100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes snRing {
          0%, 86% { opacity: 0; transform: scale(0); }
          88% { opacity: 0.5; transform: scale(0.2); }
          97%, 100% { opacity: 0; transform: scale(2.6); }
        }
        @keyframes snParticle {
          0%, 86% { opacity: 0; transform: translate(0, 0); }
          88% { opacity: 0.8; }
          98%, 100% { opacity: 0; transform: translate(var(--sx), var(--sy)); }
        }
        @keyframes nebulaDrift1 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(10%,5%) scale(1.1); } }
        @keyframes nebulaDrift2 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-8%,-6%) scale(1.15); } }
        @keyframes nebulaDrift3 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(12%,-8%) scale(1.2); } }
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
