import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
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

// ============ ЛЕНДИНГ (как в боевой главной) ============
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
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,0,0.4) 0%, rgba(255,100,0,0.2) 30%, transparent 60%)', filter: 'blur(14px)', animation: 'orbitSpin 30s linear infinite' }} />
          <div className="black-hole" style={{ width: 180, height: 180, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tighter leading-tight">
          Управляйте не людьми, <br />
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-600 bg-clip-text text-transparent">а энергией их достижений</span>
        </h1>
        <p className="max-w-2xl text-gray-400 text-lg md:text-xl mb-10">Традиционные премии — это прошлое. «Кармический Банк» — это операционная система для мотивации, которая превращает ежедневную рутину в азартную гонку за результатом.</p>
        <div className="flex gap-6"><button onClick={() => router.push('/create-company')} className="btn-gold !text-lg !py-4 !px-12">Создать компанию</button></div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-20 relative z-10">
        <h2 className="text-4xl font-bold mb-16 text-center">Бизнесу больше не нужна скучная мотивация</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="dash-card"><h3 className="!text-2xl text-gold mb-4">Тихое увольнение</h3><p className="text-sm text-gray-300 leading-relaxed">Сотрудники делают ровно столько, чтобы их не уволили.<br /><br /><strong className="text-white">Решение:</strong> Каждое микро‑действие приносит «кармики».</p></div>
          <div className="dash-card"><h3 className="!text-2xl text-gold mb-4">Выгорание</h3><p className="text-sm text-gray-300 leading-relaxed">60% сотрудников уходят, потому что чувствуют себя «винтиками».<br /><br /><strong className="text-white">Решение:</strong> В системе есть история. Менеджер — Адмирал своей компании.</p></div>
          <div className="dash-card"><h3 className="!text-2xl text-gold mb-4">Пропасть между CRM и реальностью</h3><p className="text-sm text-gray-300 leading-relaxed">Данные в CRM часто мёртвы.<br /><br /><strong className="text-white">Решение:</strong> Кармический банк «вдыхает жизнь» в цифры.</p></div>
        </div>
      </section>
      <section className="py-20 bg-gray-900/30 backdrop-blur-xl border-y border-orange-500/20">
        <div className="max-w-6xl mx-auto px-10">
          <h2 className="text-4xl font-bold mb-16 text-center">Три кита Галактики</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center"><div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 border border-white/10 flex items-center justify-center"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 blur-sm" /></div><h3 className="text-2xl font-bold mb-4">Автоматизированная меритократия</h3><p className="text-sm text-gray-300 leading-relaxed">Система объективна. У кого выше баланс — тот лидер.</p></div>
            <div className="text-center"><div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-400/20 border border-white/10 flex items-center justify-center"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 blur-sm" /></div><h3 className="text-2xl font-bold mb-4">Виртуальный бюджет с реальным весом</h3><p className="text-sm text-gray-300 leading-relaxed">«Кармики» — это ваша внутренняя валюта.</p></div>
            <div className="text-center"><div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400/20 to-teal-400/20 border border-white/10 flex items-center justify-center"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-500 blur-sm" /></div><h3 className="text-2xl font-bold mb-4">Инвестиция в HR‑бренд</h3><p className="text-sm text-gray-300 leading-relaxed">«Кармический банк» — ваше ядерное преимущество.</p></div>
          </div>
        </div>
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

// ============ КИНЕМАТОГРАФИЧНЫЙ МЕТЕОР ============
// Ядро + длинный светящийся хвост с градиентом + рой искр за ним + лёгкое дрожание
function CinematicMeteor({ left, top, dist, dur, delay, angle, hue, length }) {
  const sparks = useMemo(() =>
    Array.from({ length: 9 }).map((_, i) => ({
      id: i,
      offsetY: (i - 4) * 2.2 + (Math.random() - 0.5) * 1.6,
      offsetX: -10 - i * 7 + Math.random() * 4,
      size: 1 + Math.random() * 1.2,
      dur: 0.8 + Math.random() * 0.6,
      delay: i * 0.08,
    })), [])

  return (
    <div style={{
      position: 'absolute', left, top, zIndex: 3, pointerEvents: 'none',
      width: 0, height: 0,
      '--rot': angle + 'deg',
      '--dist': dist + 'px',
    }}>
      {/* Основной контейнер — движется по траектории */}
      <div style={{
        animation: `meteorPath ${dur}s ease-in ${delay}s infinite`,
        transform: 'rotate(var(--rot))',
        transformOrigin: '0 0',
      }}>
        {/* Дрожание траектории */}
        <div style={{ animation: `meteorJitter 2.4s ease-in-out ${delay}s infinite` }}>
          {/* Хвост — длинный градиент от ядра к прозрачному */}
          <div style={{
            position: 'absolute',
            top: -1,
            left: -length,
            width: length + 'px',
            height: 2,
            background: `linear-gradient(90deg, transparent 0%, rgba(180,210,255,0.15) 30%, rgba(200,230,255,0.55) 75%, rgba(255,255,255,0.95) 100%)`,
            filter: `drop-shadow(0 0 8px rgba(${hue}) 0%) drop-shadow(0 0 14px rgba(${hue}) 0.6))`,
            borderRadius: 2,
          }} />
          {/* Мягкое свечение вокруг хвоста */}
          <div style={{
            position: 'absolute',
            top: -10,
            left: -length + 10,
            width: length + 10 + 'px',
            height: 20,
            background: `linear-gradient(90deg, transparent 0%, rgba(${hue}) 0.05) 50%, rgba(255,255,255,0.25) 95%, transparent 100%)`,
            filter: 'blur(6px)',
            borderRadius: 10,
            opacity: 0.7,
          }} />
          {/* Ядро метеора */}
          <div style={{
            position: 'absolute',
            top: -4,
            left: -4,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #ffffff 0%, rgba(220,240,255,0.9) 40%, rgba(180,210,255,0.4) 75%, transparent 100%)',
            boxShadow: `0 0 12px rgba(255,255,255,0.95), 0 0 24px rgba(${hue}), 0 0 40px rgba(${hue}, 0.5)`,
          }} />
          {/* Рой искр за хвостом */}
          {sparks.map(s => (
            <div key={s.id} style={{
              position: 'absolute',
              top: s.offsetY + 'px',
              left: s.offsetX + 'px',
              width: s.size + 'px',
              height: s.size + 'px',
              borderRadius: '50%',
              background: '#fff',
              boxShadow: `0 0 ${s.size * 2}px rgba(${hue})`,
              opacity: 0,
              animation: `meteorSpark ${s.dur}s ease-out ${delay + s.delay}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ============ СВЕРХНОВАЯ (редкая, кинематографичная, далеко) ============
function Supernova({ left, top, delay, duration, tint }) {
  const particles = useMemo(() =>
    Array.from({ length: 12 }).map((_, i) => {
      const a = (i / 12) * Math.PI * 2
      const d = 50 + (i % 3) * 20
      return { id: i, sx: Math.cos(a) * d, sy: Math.sin(a) * d, size: 1.2 + (i % 3) * 0.5 }
    }), [])
  return (
    <div style={{ position: 'absolute', left, top, zIndex: 2, pointerEvents: 'none', width: 0, height: 0 }}>
      {/* Яркое ядро — плавное появление и затухание */}
      <div style={{
        position: 'absolute', left: -40, top: -40, width: 80, height: 80, borderRadius: '50%',
        background: `radial-gradient(circle, #ffffff 0%, ${tint} 30%, transparent 70%)`,
        filter: 'blur(1.5px)',
        animation: `snCore ${duration}s ease-in-out ${delay}s infinite`,
      }} />
      {/* Мягкое внешнее свечение */}
      <div style={{
        position: 'absolute', left: -90, top: -90, width: 180, height: 180, borderRadius: '50%',
        background: `radial-gradient(circle, ${tint}40 0%, transparent 60%)`,
        filter: 'blur(10px)',
        animation: `snGlow ${duration}s ease-in-out ${delay}s infinite`,
      }} />
      {/* Ударное кольцо — медленно расходящееся */}
      <div style={{
        position: 'absolute', left: -60, top: -60, width: 120, height: 120, borderRadius: '50%',
        border: `1px solid ${tint}`,
        boxShadow: `0 0 18px ${tint}80`,
        animation: `snRing ${duration}s ease-out ${delay}s infinite`,
      }} />
      {/* Разлетающиеся частицы */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', width: p.size + 'px', height: p.size + 'px', borderRadius: '50%',
          background: '#fff', boxShadow: `0 0 8px ${tint}`,
          '--sx': p.sx + 'px', '--sy': p.sy + 'px',
          animation: `snParticle ${duration}s ease-out ${delay}s infinite`,
        }} />
      ))}
    </div>
  )
}

// ============ ГЛАВНАЯ (v5 — медленно, величественно, кинематографично) ============
export default function Home() {
  const { user, profile, loading } = useProfile()
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [pageLoading, setPageLoading] = useState(true)
  const starsRef = useRef(null)
  const nebulaRef = useRef(null)

  // Уровень мастерства — этапы, не ранги
  const mastery = { title: 'Специалист', stage: 2, stagesTotal: 6, current: 2460, next: 3200 }
  const stages = ['Новичок', 'Специалист', 'Старший специалист', 'Эксперт', 'Мастер', 'Президент']
  const progressPercent = Math.round((mastery.current / mastery.next) * 100)
  const masteryRemaining = mastery.next - mastery.current
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

  // Параллакс — очень мягкий, плавный отклик на движение мыши
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

  // БОЕВЫЕ названия меню — из присланной актуальной главной
  const blocks = [
    { title: 'Чемпионат', sub: 'менеджеров', left: 80, top: 40, colors: ['#7AC78F', '#c084fc'] },
    { title: 'Моя компания', sub: 'данные и новости', left: 67.5, top: 61.7, colors: ['#c084fc', '#F28B82'] },
    { title: 'База знаний', sub: 'лучшие практики', left: 42.5, top: 61.7, colors: ['#c084fc', '#7AC78F'] },
    { title: 'План адаптации', sub: 'твой путь', left: 35, top: 35, colors: ['#7AC78F', '#F28B82'] },
    { title: 'Цели', sub: 'твои победы', left: 42.5, top: 18.3, colors: ['#A3E0B0', '#d4af37'] },
    { title: 'Задания', sub: '', left: 67.5, top: 18.3, colors: ['#d4af37', '#A3E0B0'] },
  ]
  const beams = blocks.map(block => {
    const dx = block.left - centerX
    const dy = block.top - centerY
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    const length = Math.sqrt(dx * dx + dy * dy) * 0.5
    return { angle, length }
  })
  const routes = {
    'Чемпионат': '/leaderboard',
    'Моя компания': '/company',
    'База знаний': '/knowledge',
    'План адаптации': '/onboarding',
    'Цели': '/goals',
    'Задания': '/tasks',
  }

  // 4 кинематографичных метеора с разными параметрами
  const meteors = [
    { left: '4%', top: '12%', dist: 620, dur: 42, delay: 8, angle: 32, hue: '160,200,255', length: 220 },
    { left: '74%', top: '8%', dist: 780, dur: 58, delay: 22, angle: -28, hue: '255,180,200', length: 260 },
    { left: '92%', top: '62%', dist: 660, dur: 47, delay: 35, angle: -158, hue: '200,160,255', length: 200 },
    { left: '18%', top: '78%', dist: 720, dur: 63, delay: 50, angle: 22, hue: '255,220,160', length: 240 },
  ]

  return (
    <>
      <Head><title>Кармический банк</title></Head>
      <div onMouseMove={handleMouseMove} style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>

        {/* Звёзды (параллакс-слой, мягкий отклик) */}
        <div ref={starsRef} style={{ position: 'absolute', top: '-2%', left: '-2%', width: '104%', height: '104%', zIndex: 0, transition: 'transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          {Array.from({ length: 170 }).map((_, i) => {
            const size = Math.random() * 2.4 + 0.5
            const colors = ['#ffffff', '#ffe0d0', '#ffddaa', '#d0e0ff', '#ffffdd', '#ffe4c4']
            const color = colors[Math.floor(Math.random() * colors.length)]
            return (
              <div key={i} style={{
                position: 'absolute', left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
                width: size + 'px', height: size + 'px', borderRadius: '50%', background: color,
                boxShadow: `0 0 ${size * 2}px ${color}`,
                opacity: Math.random() * 0.5 + 0.3,
                animation: `twinkle ${Math.random() * 14 + 8}s ease-in-out infinite`,
                animationDelay: Math.random() * 12 + 's',
              }} />
            )
          })}
        </div>

        {/* Туманности — мягкие, не кляксы, параллакс-слой */}
        <div ref={nebulaRef} style={{ position: 'absolute', top: '-3%', left: '-3%', width: '106%', height: '106%', zIndex: 1, transition: 'transform 1.6s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <div style={{ position: 'absolute', top: '15%', left: '-5%', width: '38%', height: '38%', background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.07) 0%, transparent 70%)', filter: 'blur(50px)', animation: 'nebulaDrift1 80s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: '15%', right: '-5%', width: '44%', height: '44%', background: 'radial-gradient(ellipse at center, rgba(255,150,200,0.05) 0%, transparent 70%)', filter: 'blur(55px)', animation: 'nebulaDrift2 95s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', top: '52%', left: '32%', width: '28%', height: '28%', background: 'radial-gradient(ellipse at center, rgba(160,233,255,0.04) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'nebulaDrift3 70s ease-in-out infinite alternate' }} />
        </div>

        {/* Кинематографичные метеоры */}
        {meteors.map((m, i) => <CinematicMeteor key={i} {...m} />)}

        {/* Сверхновые — редкие, далеко */}
        <Supernova left="10%" top="22%" delay={18} duration={72} tint="#a0e9ff" />
        <Supernova left="90%" top="76%" delay={55} duration={88} tint="#ffb3c6" />

        {/* Аккреционный диск вокруг дыры (медленное вращение) */}
        <div style={{
          position: 'absolute', left: centerX + '%', top: centerY + '%',
          transform: 'translate(-50%, -50%)',
          width: 540, height: 540, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, transparent, rgba(255,180,0,0.05) 20%, rgba(255,140,0,0.1) 40%, transparent 60%, rgba(139,92,246,0.08) 80%, transparent 100%)',
          filter: 'blur(32px)',
          animation: 'accretionSpin 70s linear infinite',
          pointerEvents: 'none', zIndex: 4,
        }} />

        {/* ЧЁРНАЯ ДЫРА (медленное дыхание, 14s цикл) */}
        <div style={{ position: 'absolute', left: centerX + '%', top: centerY + '%', width: 110, height: 110, zIndex: 5, animation: 'holeBreath 14s ease-in-out infinite' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,0,0.45) 0%, rgba(255,100,0,0.2) 30%, transparent 62%)', filter: 'blur(16px)', animation: 'orbitSpin 30s linear infinite' }} />
          <div style={{ position: 'absolute', top: '-6%', left: '-6%', width: '112%', height: '112%', borderRadius: '50%', background: 'radial-gradient(circle at 45% 45%, rgba(255,200,100,0.55) 0%, rgba(200,100,255,0.22) 40%, transparent 70%)', filter: 'blur(10px)', animation: 'orbitSpin 24s linear infinite reverse' }} />
          <div style={{ position: 'absolute', top: '15%', left: '15%', width: '70%', height: '70%', borderRadius: '50%', background: 'radial-gradient(circle, #000 0%, #0a0a0a 40%, transparent 80%)', boxShadow: '0 0 40px rgba(255,215,0,0.5), 0 0 90px rgba(255,180,0,0.28)', filter: 'blur(2px)' }} />
        </div>

        {/* Лучи-рукава (медленная пульсация) */}
        {beams.map((beam, idx) => (
          <div key={`beam-${idx}`} style={{
            position: 'absolute', left: centerX + '%', top: centerY + '%',
            width: beam.length + '%', height: '1px',
            background: 'linear-gradient(90deg, rgba(255,200,50,0) 0%, rgba(255,180,0,0.18) 30%, rgba(255,140,0,0.3) 60%, transparent 100%)',
            transform: `rotate(${beam.angle}deg)`, transformOrigin: '0 0',
            filter: 'blur(3px)',
            animation: `beamPulse ${9 + idx % 3}s ease-in-out infinite alternate ${idx * 0.5}s`,
            pointerEvents: 'none', zIndex: 6,
          }} />
        ))}

        {/* ОРБИТАЛЬНЫЕ КНОПКИ: гравитация (медленная, 14s синхронно с дырой) → дрейф → hover */}
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
              zIndex: 10,
              '--ux': ux, '--uy': uy,
              animation: 'gravBreath 14s ease-in-out infinite',
            }}>
              <div style={{ animation: `drift${idx % 3} ${50 + idx * 4}s ease-in-out infinite alternate` }}>
                <div
                  onClick={handleClick}
                  style={{
                    transform: 'translate(-50%, -50%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), filter 0.6s ease',
                    willChange: 'transform',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.16)'
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
                    textAlign: 'center',
                  }}>{block.title}</div>
                  {block.sub && (
                    <div style={{
                      fontSize: 13, fontWeight: 400, color: '#eaf0fb',
                      filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.5))', opacity: 0.85, textAlign: 'center',
                    }}>{block.sub}</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* === БЛОК БАЛАНСА (парящий) === */}
        <div style={{ position: 'absolute', left: '2.5%', top: '2%', zIndex: 20, animation: 'driftBalance 45s ease-in-out infinite alternate', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: 11, color: '#888', textDecoration: 'none', marginBottom: 10, transition: 'color 0.4s ease' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#a0e9ff'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#888'}>
            На главную
          </Link>
          <div style={{ fontSize: 52, fontWeight: 600, lineHeight: 1, background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6, #ffe29f, #b3f0ff)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 14px rgba(100,200,255,0.9)) drop-shadow(0 0 28px rgba(255,150,200,0.6))', animation: 'rainbowShift 9s ease-in-out infinite alternate', marginBottom: 4 }}>{balance}</div>
          <div style={{ fontSize: 12, fontWeight: 300, color: 'rgba(255,255,255,0.85)', textShadow: '0 0 8px rgba(100,200,255,0.7)', letterSpacing: 2, marginBottom: 20 }}>{karmikWord}</div>
          <div style={{ width: 70, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent)', marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { label: 'Перевести', path: '/transfer', color: '#a0e9ff' },
              { label: 'Операции', path: '/history', color: '#ffb3c6' },
              { label: 'Покупки', path: '/my-purchases', color: '#ffe29f' },
              { label: 'Магазин', path: '/shop', color: '#b3f0ff' },
            ].map((btn, idx) => (
              <div key={idx} style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)' }}
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
                <div style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.6)', textShadow: '0 0 6px rgba(100,200,255,0.4)', transition: 'all 0.4s ease', marginBottom: 5 }}>{btn.label}</div>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: btn.color, margin: '0 auto', boxShadow: `0 0 6px ${btn.color}` }} />
              </div>
            ))}
          </div>
        </div>

        {/* === УРОВЕНЬ МАСТЕРСТВА (парящий, этапы) === */}
        <div style={{ position: 'absolute', left: '2.5%', top: 250, zIndex: 20, animation: 'driftGoals 52s ease-in-out infinite alternate', width: 250 }}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 600, background: 'linear-gradient(135deg, #c084fc, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(192,132,252,0.7))', marginBottom: 3 }}>{mastery.title}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textShadow: '0 0 6px rgba(192,132,252,0.5)', letterSpacing: 1 }}>Этап {mastery.stage} из {mastery.stagesTotal}</div>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ height: '100%', width: progressPercent + '%', background: 'linear-gradient(90deg, #c084fc, #FFD700)', borderRadius: 2, boxShadow: '0 0 8px rgba(255,215,0,0.6)', animation: 'progressPulse 5s ease-in-out infinite' }} />
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textShadow: '0 0 5px rgba(192,132,252,0.4)', textAlign: 'center', marginBottom: 4 }}>
            До «{stages[mastery.stage]}»: {masteryRemaining} мастерства
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 18 }}>
            Уровень мастерства: {mastery.current.toLocaleString('ru')} / {mastery.next.toLocaleString('ru')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {skills.map((skill, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textShadow: '0 0 6px rgba(255,255,255,0.3)', fontWeight: 500 }}>{skill.name}</span>
                  <span style={{ fontSize: 11, color: skill.color, textShadow: `0 0 6px ${skill.color}`, fontWeight: 600 }}>{skill.value}%</span>
                </div>
                <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: skill.value + '%', background: `linear-gradient(90deg, ${skill.color}40, ${skill.color})`, borderRadius: 2, boxShadow: `0 0 6px ${skill.color}`, animation: `skillGrow${idx} 2.5s ease-out forwards` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.95); } 50% { opacity: 0.7; transform: scale(1.05); } }
        @keyframes orbitSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes accretionSpin { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes beamPulse { 0% { opacity: 0.15; } 100% { opacity: 0.45; } }
        @keyframes drift0 { 0% { transform: translateX(-6px) translateY(3px); } 100% { transform: translateX(6px) translateY(-3px); } }
        @keyframes drift1 { 0% { transform: translateX(5px) translateY(-5px); } 100% { transform: translateX(-5px) translateY(5px); } }
        @keyframes drift2 { 0% { transform: translateX(-5px) translateY(-4px); } 100% { transform: translateX(5px) translateY(4px); } }
        @keyframes driftBalance { 0% { transform: translate(0, 0); } 100% { transform: translate(4px, -4px); } }
        @keyframes driftGoals { 0% { transform: translate(0, 0); } 100% { transform: translate(-3px, 5px); } }
        @keyframes rainbowShift { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
        @keyframes progressPulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
        /* Дыхание дыры и гравитация кнопок — один цикл 14s, медленно, величественно */
        @keyframes holeBreath {
          0%, 100% { transform: translate(-50%, -50%) scale(0.92); }
          50% { transform: translate(-50%, -50%) scale(1.14); }
        }
        @keyframes gravBreath {
          0%, 100% { transform: translate(calc(var(--ux) * 14px), calc(var(--uy) * 14px)); }
          50% { transform: translate(calc(var(--ux) * -22px), calc(var(--uy) * -22px)); }
        }
        /* Кинематографичный метеор: путь + дрожание */
        @keyframes meteorPath {
          0%, 100% { opacity: 0; transform: rotate(var(--rot)) translateX(0); }
          3% { opacity: 1; }
          20% { opacity: 1; transform: rotate(var(--rot)) translateX(calc(var(--dist) * 0.6)); }
          28% { opacity: 0; transform: rotate(var(--rot)) translateX(var(--dist)); }
          28.01%, 99.99% { opacity: 0; }
        }
        @keyframes meteorJitter {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-0.6px); }
          50% { transform: translateY(0.4px); }
          75% { transform: translateY(-0.3px); }
        }
        @keyframes meteorSpark {
          0% { opacity: 0; transform: translate(0, 0) scale(0.3); }
          20% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(18px, 2px) scale(0.2); }
        }
        /* Сверхновая */
        @keyframes snCore {
          0%, 90% { opacity: 0; transform: scale(0); }
          92% { opacity: 0.9; transform: scale(0.3); }
          95% { opacity: 0.85; transform: scale(1); }
          99%, 100% { opacity: 0; transform: scale(1.4); }
        }
        @keyframes snGlow {
          0%, 90% { opacity: 0; }
          93% { opacity: 0.6; }
          98%, 100% { opacity: 0; }
        }
        @keyframes snRing {
          0%, 91% { opacity: 0; transform: scale(0.2); }
          93% { opacity: 0.5; }
          99%, 100% { opacity: 0; transform: scale(2.4); }
        }
        @keyframes snParticle {
          0%, 91% { opacity: 0; transform: translate(0, 0); }
          93% { opacity: 0.8; }
          99%, 100% { opacity: 0; transform: translate(var(--sx), var(--sy)); }
        }
        @keyframes nebulaDrift1 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(8%,4%) scale(1.08); } }
        @keyframes nebulaDrift2 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-6%,-5%) scale(1.1); } }
        @keyframes nebulaDrift3 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(9%,-6%) scale(1.12); } }
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
