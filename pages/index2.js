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
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,0,0.4) 0%, rgba(255,100,0,0.2) 30%, transparent 60%)', filter: 'blur(14px)', animation: 'orbitSpin 80s linear infinite' }} />
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

// ============ УЛЬТРА-ПРЕМИУМ КОМЕТА ============
// Многослойный хвост + 18 искр с физикой + пылевой след + двойное свечение ядра + волнистая траектория
function PremiumMeteor({ left, top, dist, dur, delay, angle, length }) {
  // Искры: каждая со своей физикой — скоростью, временем жизни, отклонением
  const sparks = useMemo(() =>
    Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      offsetY: (Math.random() - 0.5) * 8,
      offsetX: -12 - Math.random() * 40,
      size: 1 + Math.random() * 1.8,
      lifeDur: 1.2 + Math.random() * 1.2,
      lifeDelay: Math.random() * 1.5,
      driftX: 20 + Math.random() * 30,
      driftY: (Math.random() - 0.5) * 6,
      hue: 180 + Math.random() * 60,
    })), [])

  // Пылевые частицы — мягкое размытое свечение вдоль хвоста
  const dust = useMemo(() =>
    Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      offsetX: -20 - i * (length / 8),
      offsetY: (Math.random() - 0.5) * 3,
      size: 4 + Math.random() * 4,
      opacity: 0.15 + Math.random() * 0.2,
    })), [length])

  return (
    <div style={{
      position: 'absolute', left, top, zIndex: 3, pointerEvents: 'none',
      width: 0, height: 0,
      '--rot': angle + 'deg',
      '--dist': dist + 'px',
    }}>
      {/* Главный контейнер — движется по траектории, долго и медленно */}
      <div style={{
        animation: `meteorPath ${dur}s ease-in ${delay}s infinite`,
        transform: 'rotate(var(--rot))',
        transformOrigin: '0 0',
      }}>
        {/* Волнистость траектории — мягкое покачивание */}
        <div style={{ animation: `meteorSine ${dur * 0.4}s ease-in-out ${delay}s infinite` }}>

          {/* Длинный диффузный слой хвоста (самый дальний) */}
          <div style={{
            position: 'absolute', top: -1.5, left: -length * 1.4,
            width: length * 1.4 + 'px', height: 3,
            background: 'linear-gradient(90deg, transparent 0%, rgba(100,160,255,0.1) 30%, rgba(160,200,255,0.3) 80%, rgba(255,255,255,0.6) 100%)',
            filter: 'blur(2px)',
            borderRadius: 2,
          }} />

          {/* Средний слой хвоста */}
          <div style={{
            position: 'absolute', top: -1, left: -length,
            width: length + 'px', height: 2,
            background: 'linear-gradient(90deg, transparent 0%, rgba(140,190,255,0.2) 40%, rgba(200,230,255,0.7) 85%, rgba(255,255,255,0.95) 100%)',
            filter: 'blur(0.8px)',
            borderRadius: 2,
          }} />

          {/* Яркий короткий слой хвоста */}
          <div style={{
            position: 'absolute', top: -0.75, left: -length * 0.5,
            width: length * 0.5 + 'px', height: 1.5,
            background: 'linear-gradient(90deg, transparent 0%, rgba(200,230,255,0.7) 70%, #ffffff 100%)',
            borderRadius: 2,
          }} />

          {/* Пылевой след — мягкое свечение вдоль траектории */}
          {dust.map(d => (
            <div key={d.id} style={{
              position: 'absolute', top: d.offsetY + 'px', left: d.offsetX + 'px',
              width: d.size + 'px', height: d.size + 'px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(200,230,255,' + d.opacity + ') 0%, transparent 70%)',
              filter: 'blur(3px)',
            }} />
          ))}

          {/* Искры с физикой — каждая живёт своей жизнью */}
          {sparks.map(s => (
            <div key={s.id} style={{
              position: 'absolute', top: s.offsetY + 'px', left: s.offsetX + 'px',
              width: s.size + 'px', height: s.size + 'px', borderRadius: '50%',
              background: `hsl(${s.hue}, 80%, 80%)`,
              boxShadow: `0 0 ${s.size * 2}px hsl(${s.hue}, 90%, 75%)`,
              opacity: 0,
              '--driftX': s.driftX + 'px', '--driftY': s.driftY + 'px',
              animation: `meteorSpark ${s.lifeDur}s ease-out ${delay + s.lifeDelay}s infinite`,
            }} />
          ))}

          {/* Внешний ореол ядра (голубой) */}
          <div style={{
            position: 'absolute', top: -8, left: -8, width: 16, height: 16,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(160,220,255,0.9) 0%, rgba(120,180,255,0.4) 40%, transparent 70%)',
            filter: 'blur(1.5px)',
            animation: 'meteorTwinkle 1.8s ease-in-out infinite',
          }} />

          {/* Внутреннее ядро (белое, очень яркое) */}
          <div style={{
            position: 'absolute', top: -3.5, left: -3.5, width: 7, height: 7,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #ffffff 0%, rgba(255,255,255,0.95) 40%, rgba(220,240,255,0.5) 75%, transparent 100%)',
            boxShadow: '0 0 8px rgba(255,255,255,1), 0 0 20px rgba(160,220,255,0.9), 0 0 40px rgba(120,180,255,0.5)',
          }} />
        </div>
      </div>
    </div>
  )
}

// ============ КИНЕМАТОГРАФИЧНАЯ СВЕРХНОВАЯ ============
// Асимметричный взрыв, спиральные фрагменты, хроматическая аберрация, остаточная туманность
function CinematicSupernova({ left, top, delay, duration, coreTint, ringTint, dustTint }) {
  // Пылевые фрагменты, разлетающиеся по СПИРАЛИ (не радиально) — это и даёт кинематографичность
  const fragments = useMemo(() =>
    Array.from({ length: 24 }).map((_, i) => {
      const baseAngle = (i / 24) * Math.PI * 2 + (Math.random() - 0.5) * 0.6
      const dist = 60 + Math.random() * 110
      const spiralTwist = (Math.random() - 0.5) * 1.8
      const size = 1 + Math.random() * 2.2
      return {
        id: i,
        startX: 0, startY: 0,
        endX: Math.cos(baseAngle) * dist,
        endY: Math.sin(baseAngle) * dist,
        midX: Math.cos(baseAngle + spiralTwist) * dist * 0.5,
        midY: Math.sin(baseAngle + spiralTwist) * dist * 0.5,
        size,
        delay: Math.random() * 0.4,
      }
    }), [])

  return (
    <div style={{ position: 'absolute', left, top, zIndex: 2, pointerEvents: 'none', width: 0, height: 0 }}>

      {/* === ОСТАТОЧНАЯ ТУМАННОСТЬ (держится после взрыва) === */}
      {/* Появляется медленно и остаётся как напоминание — не идеальная форма */}
      <div style={{
        position: 'absolute',
        animation: `snRemnant ${duration}s ease-out ${delay}s infinite`,
      }}>
        <div style={{
          position: 'absolute', left: -55, top: -50, width: 110, height: 100,
          background: `radial-gradient(ellipse at 45% 48%, ${dustTint}35 0%, ${dustTint}15 40%, transparent 75%)`,
          filter: 'blur(12px)',
          borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%',
          opacity: 0,
          animation: `snRemnantGlow ${duration}s ease-out ${delay}s infinite`,
        }} />
      </div>

      {/* === ЯДРО ВЗРЫВА — асимметричное, из 3 перекрывающихся кругов === */}
      <div style={{
        position: 'absolute',
        animation: `snCoreBurst ${duration}s ease-out ${delay}s infinite`,
        transformOrigin: '0 0',
      }}>
        {/* Основной круг */}
        <div style={{
          position: 'absolute', left: -50, top: -50, width: 100, height: 100,
          borderRadius: '50%',
          background: `radial-gradient(circle at 48% 52%, #ffffff 0%, ${coreTint} 30%, ${coreTint}80 60%, transparent 85%)`,
          filter: 'blur(2px)',
        }} />
        {/* Второй круг со смещением (асимметрия) */}
        <div style={{
          position: 'absolute', left: -40, top: -55, width: 90, height: 95,
          borderRadius: '50%',
          background: `radial-gradient(circle at 52% 48%, ${coreTint} 0%, transparent 70%)`,
          filter: 'blur(3px)', opacity: 0.7,
        }} />
        {/* Третий круг (ещё асимметрия) */}
        <div style={{
          position: 'absolute', left: -55, top: -45, width: 95, height: 90,
          borderRadius: '50%',
          background: `radial-gradient(circle at 45% 55%, ${coreTint}90 0%, transparent 65%)`,
          filter: 'blur(3px)', opacity: 0.6,
        }} />
      </div>

      {/* === ХРОМАТИЧЕСКОЕ СВЕЧЕНИЕ (несколько цветов вокруг ядра) === */}
      <div style={{
        position: 'absolute', left: -70, top: -70, width: 140, height: 140,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${coreTint}50 0%, ${coreTint}20 30%, transparent 65%)`,
        filter: 'blur(6px)',
        animation: `snChromatic ${duration}s ease-out ${delay}s infinite`,
      }} />
      <div style={{
        position: 'absolute', left: -90, top: -85, width: 180, height: 170,
        borderRadius: '50%',
        background: `radial-gradient(circle at 55% 45%, ${ringTint}30 0%, transparent 60%)`,
        filter: 'blur(10px)',
        animation: `snChromatic ${duration}s ease-out ${delay + 0.2}s infinite`,
      }} />

      {/* === УДАРНЫЕ ВОЛНЫ — 3 штуки, расходятся с разной скоростью === */}
      <div style={{
        position: 'absolute', left: -80, top: -80, width: 160, height: 160,
        borderRadius: '50%',
        border: `2px solid ${ringTint}`,
        boxShadow: `0 0 24px ${ringTint}99, inset 0 0 12px ${ringTint}55`,
        animation: `snShockwave1 ${duration}s ease-out ${delay}s infinite`,
      }} />
      <div style={{
        position: 'absolute', left: -60, top: -60, width: 120, height: 120,
        borderRadius: '50%',
        border: `1px solid ${coreTint}`,
        boxShadow: `0 0 16px ${coreTint}88`,
        animation: `snShockwave2 ${duration}s ease-out ${delay + 0.3}s infinite`,
      }} />
      <div style={{
        position: 'absolute', left: -40, top: -40, width: 80, height: 80,
        borderRadius: '50%',
        border: `1px solid #ffffff`,
        boxShadow: `0 0 10px #ffffff99`,
        animation: `snShockwave3 ${duration}s ease-out ${delay + 0.6}s infinite`,
      }} />

      {/* === СПИРАЛЬНЫЕ ФРАГМЕНТЫ (главная "кинематографичность") === */}
      {fragments.map(f => (
        <div key={f.id} style={{
          position: 'absolute',
          width: f.size + 'px', height: f.size + 'px',
          borderRadius: '50%',
          background: f.id % 3 === 0 ? '#ffffff' : dustTint,
          boxShadow: `0 0 ${f.size * 3}px ${f.id % 3 === 0 ? '#ffffff' : dustTint}`,
          opacity: 0,
          '--endX': f.endX + 'px', '--endY': f.endY + 'px',
          '--midX': f.midX + 'px', '--midY': f.midY + 'px',
          animation: `snFragment ${duration}s ease-out ${delay + f.delay}s infinite`,
        }} />
      ))}
    </div>
  )
}

// ============ ГЛАВНАЯ (v6 — медленно, величественно, кинематографично) ============
export default function Home() {
  const { user, profile, loading } = useProfile()
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [pageLoading, setPageLoading] = useState(true)
  const starsRef = useRef(null)
  const nebulaRef = useRef(null)

  // Кармическая энергия + звание (уровень мастерства)
  const mastery = {
    title: 'Специалист',        // звание
    stage: 2,                   // этап из 6
    stagesTotal: 6,
    currentEnergy: 2460,        // кармическая энергия
    nextEnergy: 3200,           // сколько нужно до следующего звания
  }
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

  // Мягкий параллакс
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

  // Боевые названия меню (как ты прислал)
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

  // 4 ультра-премиум кометы с разными характеристиками (очень медленные)
  const meteors = [
    { left: '4%', top: '12%', dist: 900, dur: 150, delay: 12, angle: 32, length: 280 },
    { left: '76%', top: '8%', dist: 1100, dur: 190, delay: 45, angle: -28, length: 320 },
    { left: '92%', top: '62%', dist: 950, dur: 165, delay: 95, angle: -158, length: 260 },
    { left: '16%', top: '80%', dist: 1050, dur: 205, delay: 140, angle: 22, length: 300 },
  ]

  return (
    <>
      <Head><title>Кармический банк</title></Head>
      <div onMouseMove={handleMouseMove} style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>

        {/* Звёзды (параллакс) */}
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

        {/* Туманности (мягкие переливы, органично) */}
        <div ref={nebulaRef} style={{ position: 'absolute', top: '-3%', left: '-3%', width: '106%', height: '106%', zIndex: 1, transition: 'transform 2s cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <div style={{ position: 'absolute', top: '18%', left: '-4%', width: '38%', height: '38%', background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.06) 0%, transparent 70%)', filter: 'blur(55px)', animation: 'nebulaDrift1 220s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: '18%', right: '-4%', width: '44%', height: '44%', background: 'radial-gradient(ellipse at center, rgba(255,150,200,0.045) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'nebulaDrift2 260s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', top: '55%', left: '30%', width: '28%', height: '28%', background: 'radial-gradient(ellipse at center, rgba(160,233,255,0.04) 0%, transparent 70%)', filter: 'blur(65px)', animation: 'nebulaDrift3 180s ease-in-out infinite alternate' }} />
        </div>

        {/* Мягкие переливы снизу (возвращены, органично) */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 100%, rgba(255,100,50,0.18) 0%, rgba(255,100,50,0.08) 40%, transparent 75%)', filter: 'blur(18px)', animation: 'breathe1 38s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: 0, left: '-8%', width: '115%', height: '100%', background: 'radial-gradient(ellipse at 28% 100%, rgba(255,100,150,0.1) 0%, transparent 70%)', filter: 'blur(22px)', animation: 'breathe2 46s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: 0, right: '-8%', width: '115%', height: '100%', background: 'radial-gradient(ellipse at 72% 100%, rgba(130,100,255,0.12) 0%, transparent 70%)', filter: 'blur(24px)', animation: 'breathe3 54s ease-in-out infinite alternate' }} />
        </div>

        {/* Ультра-премиум кометы */}
        {meteors.map((m, i) => <PremiumMeteor key={i} {...m} />)}

        {/* Кинематографичные сверхновые (очень редкие, 180-240s) */}
        <CinematicSupernova left="11%" top="23%" delay={25} duration={210} coreTint="#a0e9ff" ringTint="#c084fc" dustTint="#a0e9ff" />
        <CinematicSupernova left="89%" top="75%" delay={120} duration={240} coreTint="#ffb3c6" ringTint="#FFD700" dustTint="#ffb3c6" />

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

        {/* ЧЁРНАЯ ДЫРА — очень медленное дыхание (30s) */}
        <div style={{ position: 'absolute', left: centerX + '%', top: centerY + '%', width: 110, height: 110, zIndex: 5, animation: 'holeBreath 30s ease-in-out infinite' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,0,0.45) 0%, rgba(255,100,0,0.2) 30%, transparent 62%)', filter: 'blur(16px)', animation: 'orbitSpin 90s linear infinite' }} />
          <div style={{ position: 'absolute', top: '-6%', left: '-6%', width: '112%', height: '112%', borderRadius: '50%', background: 'radial-gradient(circle at 45% 45%, rgba(255,200,100,0.55) 0%, rgba(200,100,255,0.22) 40%, transparent 70%)', filter: 'blur(10px)', animation: 'orbitSpin 70s linear infinite reverse' }} />
          <div style={{ position: 'absolute', top: '15%', left: '15%', width: '70%', height: '70%', borderRadius: '50%', background: 'radial-gradient(circle, #000 0%, #0a0a0a 40%, transparent 80%)', boxShadow: '0 0 40px rgba(255,215,0,0.5), 0 0 90px rgba(255,180,0,0.28)', filter: 'blur(2px)' }} />
        </div>

        {/* Лучи-рукава (очень медленно пульсируют) */}
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

        {/* ОРБИТАЛЬНЫЕ КНОПКИ: гравитация 30s → дрейф 130s → hover */}
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

        {/* === БЛОК БАЛАНСА (парящий) — только Перевести и Операции === */}
        <div style={{ position: 'absolute', left: '2.5%', top: '2%', zIndex: 20, animation: 'driftBalance 55s ease-in-out infinite alternate', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: 11, color: '#888', textDecoration: 'none', marginBottom: 10, transition: 'color 0.5s ease' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#a0e9ff'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#888'}>
            На главную
          </Link>
          <div style={{ fontSize: 52, fontWeight: 600, lineHeight: 1, background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6, #ffe29f, #b3f0ff)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 14px rgba(100,200,255,0.9)) drop-shadow(0 0 28px rgba(255,150,200,0.6))', animation: 'rainbowShift 12s ease-in-out infinite alternate', marginBottom: 4 }}>{balance}</div>
          <div style={{ fontSize: 12, fontWeight: 300, color: 'rgba(255,255,255,0.85)', textShadow: '0 0 8px rgba(100,200,255,0.7)', letterSpacing: 2, marginBottom: 20 }}>{karmikWord}</div>
          <div style={{ width: 70, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent)', marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
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
                <div style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.6)', textShadow: '0 0 6px rgba(100,200,255,0.4)', transition: 'all 0.5s ease', marginBottom: 5 }}>{btn.label}</div>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: btn.color, margin: '0 auto', boxShadow: `0 0 6px ${btn.color}` }} />
              </div>
            ))}
          </div>
        </div>

        {/* === КАРМИЧЕСКАЯ ЭНЕРГИЯ (парящий, звание + энергия) === */}
        <div style={{ position: 'absolute', left: '2.5%', top: 250, zIndex: 20, animation: 'driftGoals 60s ease-in-out infinite alternate', width: 250 }}>
          {/* Звание (уровень мастерства) */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 300, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', textShadow: '0 0 6px rgba(192,132,252,0.4)', marginBottom: 4 }}>Уровень мастерства</div>
            <div style={{ fontSize: 22, fontWeight: 600, background: 'linear-gradient(135deg, #c084fc, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(192,132,252,0.7))', marginBottom: 3 }}>{mastery.title}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textShadow: '0 0 6px rgba(192,132,252,0.5)', letterSpacing: 1 }}>Этап {mastery.stage} из {mastery.stagesTotal}</div>
          </div>

          {/* Кармическая энергия — цифры */}
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 300, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', textShadow: '0 0 6px rgba(255,215,0,0.4)', marginBottom: 4 }}>Кармическая энергия</div>
            <div style={{
              fontSize: 24, fontWeight: 600,
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

          {/* Прогресс до следующего звания */}
          <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 18, marginTop: 10 }}>
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
        @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.95); } 50% { opacity: 0.7; transform: scale(1.05); } }
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
        @keyframes breathe2 { 0% { opacity: 0.5; transform: scaleY(1.03) translateX(-1%); } 100% { opacity: 0.9; transform: scaleY(1.12) translateX(1%); } }
        @keyframes breathe3 { 0% { opacity: 0.4; transform: scaleY(1.05) translateX(1%); } 100% { opacity: 0.8; transform: scaleY(1.15) translateX(-1%); } }

        /* Дыхание дыры и гравитация — 30s синхронно, очень медленно */
        @keyframes holeBreath {
          0%, 100% { transform: translate(-50%, -50%) scale(0.93); }
          50% { transform: translate(-50%, -50%) scale(1.12); }
        }
        @keyframes gravBreath {
          0%, 100% { transform: translate(calc(var(--ux) * 12px), calc(var(--uy) * 12px)); }
          50% { transform: translate(calc(var(--ux) * -18px), calc(var(--uy) * -18px)); }
        }

        /* УЛЬТРА-ПРЕМИУМ КОМЕТА — путь + волнистость + искры */
        @keyframes meteorPath {
          0%, 100% { opacity: 0; transform: rotate(var(--rot)) translateX(0); }
          3% { opacity: 1; }
          22% { opacity: 1; transform: rotate(var(--rot)) translateX(calc(var(--dist) * 0.55)); }
          30% { opacity: 0; transform: rotate(var(--rot)) translateX(var(--dist)); }
          30.01%, 99.99% { opacity: 0; }
        }
        @keyframes meteorSine {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(2px); }
        }
        @keyframes meteorTwinkle {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes meteorSpark {
          0% { opacity: 0; transform: translate(0, 0) scale(0.4); }
          15% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--driftX), var(--driftY)) scale(0.2); }
        }

        /* КИНЕМАТОГРАФИЧНАЯ СВЕРХНОВАЯ — асимметричный взрыв со спиральными фрагментами */
        @keyframes snCoreBurst {
          0%, 92% { opacity: 0; transform: scale(0); }
          93.5% { opacity: 1; transform: scale(0.4); }
          95% { opacity: 0.95; transform: scale(1); }
          97.5% { opacity: 0.4; transform: scale(1.3); }
          99%, 100% { opacity: 0; transform: scale(1.6); }
        }
        @keyframes snChromatic {
          0%, 92% { opacity: 0; }
          94% { opacity: 0.8; }
          98.5%, 100% { opacity: 0; }
        }
        @keyframes snShockwave1 {
          0%, 93% { opacity: 0; transform: scale(0.3); }
          94% { opacity: 0.9; }
          99.5%, 100% { opacity: 0; transform: scale(2.6); }
        }
        @keyframes snShockwave2 {
          0%, 93.5% { opacity: 0; transform: scale(0.25); }
          94.5% { opacity: 0.7; }
          99.5%, 100% { opacity: 0; transform: scale(2.2); }
        }
        @keyframes snShockwave3 {
          0%, 94% { opacity: 0; transform: scale(0.2); }
          95% { opacity: 0.6; }
          99.5%, 100% { opacity: 0; transform: scale(1.8); }
        }
        /* Спиральные фрагменты — каждый со своей кривой через midX/midY */
        @keyframes snFragment {
          0%, 93% { opacity: 0; transform: translate(0, 0); }
          94% { opacity: 1; transform: translate(var(--midX), var(--midY)); }
          99.5%, 100% { opacity: 0; transform: translate(var(--endX), var(--endY)); }
        }
        /* Остаточная туманность — появляется и держится дольше взрыва */
        @keyframes snRemnant {
          0%, 95% { opacity: 0; }
          96% { opacity: 0.3; }
          99.5% { opacity: 0.2; }
          100% { opacity: 0; }
        }
        @keyframes snRemnantGlow {
          0%, 95% { opacity: 0; }
          96% { opacity: 1; }
          99.5% { opacity: 0.7; }
          100% { opacity: 0; }
        }

        @keyframes nebulaDrift1 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(6%,3%) scale(1.05); } }
        @keyframes nebulaDrift2 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-5%,-4%) scale(1.07); } }
        @keyframes nebulaDrift3 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(7%,-5%) scale(1.08); } }

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
