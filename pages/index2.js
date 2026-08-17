import { useEffect, useState, useMemo } from 'react'
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
        <div className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
          Кармический банк
        </div>
        {user ? (
          <button onClick={() => router.push('/')} className="text-sm font-medium text-white/70 hover:text-white transition-colors px-5 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">
            Вернуться в систему
          </button>
        ) : (
          <button onClick={() => router.push('/login')} className="text-sm font-medium text-white/70 hover:text-white transition-colors px-5 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">
            Войти
          </button>
        )}
      </header>
      <section className="relative pt-32 pb-20 flex flex-col items-center text-center px-4">
        <div className="hero-black-hole mb-12" style={{ position: 'relative', width: 180, height: 180 }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,0,0.4) 0%, rgba(255,100,0,0.2) 30%, transparent 60%)', filter: 'blur(14px)', animation: 'orbitSpin 10s linear infinite' }} />
          <div style={{ position: 'absolute', top: '-5%', left: '-5%', width: '110%', height: '110%', borderRadius: '50%', background: 'radial-gradient(circle at 45% 45%, rgba(255,200,100,0.5) 0%, rgba(200,100,255,0.2) 40%, transparent 70%)', filter: 'blur(10px)', animation: 'orbitSpin 8s linear infinite reverse' }} />
          <div className="black-hole" style={{ width: 180, height: 180, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tighter leading-tight">
          Управляйте не людьми, <br />
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-600 bg-clip-text text-transparent">а энергией их достижений</span>
        </h1>
        <p className="max-w-2xl text-gray-400 text-lg md:text-xl mb-10">
          Традиционные премии — это прошлое. «Кармический Банк» — это операционная система для мотивации, которая превращает ежедневную рутину в азартную гонку за результатом.
        </p>
        <button onClick={() => router.push('/create-company')} className="btn-gold !text-lg !py-4 !px-12 animate-pulse">Создать компанию</button>
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
            <div className="text-center"><div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400/20 to-teal-400/20 border border-white/10 flex items-center justify-center"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-500 blur-sm" /></div><h3 className="text-2xl font-bold mb-4">Инвестиция в HR‑бренд</h3><p className="text-sm text-gray-300 leading-relaxed">«Кармический банк» — ваше ядерное преимущество на рынке труда.</p></div>
          </div>
        </div>
      </section>
      <section className="py-32 flex flex-col items-center">
        <h2 className="text-4xl font-bold mb-8 text-center px-6">Перестаньте платить только за время.<br />Начните инвестировать в вовлечённость.</h2>
        <button onClick={() => router.push('/create-company')} className="wide-btn !w-auto !px-20 !py-6 text-xl mt-12">Стать частью экосистемы</button>
      </section>
      <footer className="py-10 border-t border-white/5 text-center text-gray-600 text-xs">© {new Date().getFullYear()} Кармический банк.</footer>
    </div>
  )
}

// ============ ПАДАЮЩИЕ ЗВЁЗДЫ (новая активность фона) ============
function ShootingStars() {
  const stars = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      top: Math.random() * 70,
      left: Math.random() * 100,
      delay: Math.random() * 15 + i * 2,
      duration: Math.random() * 1.5 + 1,
      angle: Math.random() * 20 + 20,
      length: Math.random() * 150 + 100,
    }))
  }, [])
  return (
    <>
      {stars.map(s => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            top: s.top + '%',
            left: s.left + '%',
            width: s.length + 'px',
            height: '1.5px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)',
            transform: `rotate(${s.angle}deg)`,
            transformOrigin: 'left center',
            opacity: 0,
            animation: `shootingStar ${s.duration}s ease-out ${s.delay}s infinite`,
            filter: 'drop-shadow(0 0 4px rgba(160,233,255,0.8))',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />
      ))}
    </>
  )
}

// ============ ТУМАННОСТИ (медленно плывут) ============
function Nebulas() {
  return (
    <>
      <div style={{
        position: 'absolute', top: '10%', left: '-10%', width: '40%', height: '40%',
        background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, transparent 70%)',
        filter: 'blur(40px)', animation: 'nebulaDrift1 40s ease-in-out infinite alternate',
        pointerEvents: 'none', zIndex: 2,
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '-10%', width: '50%', height: '50%',
        background: 'radial-gradient(ellipse at center, rgba(255,150,200,0.06) 0%, transparent 70%)',
        filter: 'blur(40px)', animation: 'nebulaDrift2 50s ease-in-out infinite alternate',
        pointerEvents: 'none', zIndex: 2,
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '30%', width: '30%', height: '30%',
        background: 'radial-gradient(ellipse at center, rgba(160,233,255,0.05) 0%, transparent 70%)',
        filter: 'blur(50px)', animation: 'nebulaDrift3 35s ease-in-out infinite alternate',
        pointerEvents: 'none', zIndex: 2,
      }} />
    </>
  )
}

// ============ ОРБИТАЛЬНЫЕ ЧАСТИЦЫ ВОКРУГ КНОПКИ ============
function OrbitParticles({ colors }) {
  const particles = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => ({
      id: i,
      radius: 24 + Math.random() * 8,
      duration: 4 + i * 0.7,
      delay: i * 0.5,
      size: Math.random() * 2 + 1,
      color: colors[i % 2],
    }))
  }, [colors])
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            width: p.size + 'px',
            height: p.size + 'px',
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) rotate(0deg) translateX(${p.radius}px)`,
            animation: `orbitParticle ${p.duration}s linear ${p.delay}s infinite`,
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  )
}

// ============ ГЛАВНАЯ (ДИЗАЙН V2) ============
export default function Home() {
  const { user, profile, loading } = useProfile()
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [stats, setStats] = useState({ active: 0, completed: 0, earned: 0 })
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!user) { setPageLoading(false); return }
    if (!loading && !isSuperAdmin(profile) && (!profile || !profile.company_id)) {
      router.push('/welcome'); return
    }
    const loadData = async () => {
      const { data: bal } = await supabase.from('karma_balance').select('balance').eq('user_id', user.id).single()
      if (bal) setBalance(bal.balance)
      const { data: active } = await supabase.from('task_assignments').select('status').eq('user_id', user.id).in('status', ['assigned', 'in_progress', 'pending_review'])
      const { data: completed } = await supabase.from('task_assignments').select('status, tasks(reward_karma)').eq('user_id', user.id).eq('status', 'completed')
      const earned = completed?.reduce((sum, a) => sum + (a.tasks?.reward_karma || 0), 0) || 0
      setStats({ active: active?.length || 0, completed: completed?.length || 0, earned })
      setPageLoading(false)
    }
    loadData()
  }, [user, loading, profile])

  if (loading || pageLoading) return null
  if (!user) return <CorporateLanding />

  const karmikWord = getKarmikWord(balance)

  // Центр чёрной дыры (в процентах от viewport)
  const centerX = 55
  const centerY = 50
  const orbitRadius = 22 // радиус орбиты в %

  // 8 блоков равномерно по окружности
  const blocks = [
    { title: 'Задания', sub: 'мои задачи', colors: ['#d4af37', '#A3E0B0'], path: '/tasks' },
    { title: 'Магазин', sub: 'награды', colors: ['#F28B82', '#FFD700'], path: '/shop' },
    { title: 'Покупки', sub: 'история', colors: ['#A3E0B0', '#a0e9ff'], path: '/my-purchases' },
    { title: 'Чемпионат', sub: 'менеджеров', colors: ['#7AC78F', '#c084fc'], path: '/leaderboard' },
    { title: 'Гороскоп', sub: 'профессий', colors: ['#c084fc', '#F28B82'], path: '/events' },
    { title: 'Журнал ПРО', sub: 'практики', colors: ['#c084fc', '#7AC78F'], path: '/confirm' },
    { title: 'Квиз', sub: 'проверь себя', colors: ['#7AC78F', '#F28B82'], path: '/' },
    { title: 'ИИ‑питомец', sub: 'развивай', colors: ['#A3E0B0', '#d4af37'], path: '/' },
  ].map((block, i) => {
    const angle = (i * 360 / 8) - 90 // стартуем сверху
    const rad = angle * Math.PI / 180
    const x = centerX + Math.cos(rad) * orbitRadius
    const y = centerY + Math.sin(rad) * (orbitRadius * 0.75) // чуть сплюснутый эллипс
    return { ...block, left: x, top: y, angle, idx: i }
  })

  return (
    <>
      <Head><title>Кармический банк</title></Head>
      <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
        {/* Звёзды */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
          {Array.from({ length: 200 }).map((_, i) => {
            const size = Math.random() * 2.2 + 0.4
            const colors = ['#ffffff', '#ffe0d0', '#ffddaa', '#d0e0ff', '#ffffdd', '#ffe4c4']
            const color = colors[Math.floor(Math.random() * colors.length)]
            return (
              <div key={i} style={{
                position: 'absolute', left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
                width: size + 'px', height: size + 'px', borderRadius: '50%', background: color,
                boxShadow: `0 0 ${size * 2}px ${color}`,
                opacity: Math.random() * 0.5 + 0.3,
                animation: `twinkle ${Math.random() * 8 + 4}s ease-in-out ${Math.random() * 5}s infinite`,
              }} />
            )
          })}
        </div>

        {/* Туманности (новая активность) */}
        <Nebulas />

        {/* Падающие звёзды (новая активность) */}
        <ShootingStars />

        {/* Аккреционный диск вокруг чёрной дыры */}
        <div style={{
          position: 'absolute', left: centerX + '%', top: centerY + '%',
          transform: 'translate(-50%, -50%)',
          width: '500px', height: '500px',
          borderRadius: '50%',
          background: 'conic-gradient(from 0deg, transparent, rgba(255,180,0,0.05) 20%, rgba(255,140,0,0.1) 40%, transparent 60%, rgba(139,92,246,0.08) 80%, transparent 100%)',
          filter: 'blur(30px)',
          animation: 'accretionDiskSpin 30s linear infinite',
          pointerEvents: 'none', zIndex: 4,
        }} />

        {/* Орбитальные кольца (тонкие, едва видимые) */}
        <div style={{
          position: 'absolute', left: centerX + '%', top: centerY + '%',
          transform: 'translate(-50%, -50%)',
          width: orbitRadius * 2 + '%',
          height: orbitRadius * 1.5 + '%',
          borderRadius: '50%',
          border: '1px solid rgba(255,215,0,0.08)',
          boxShadow: '0 0 20px rgba(255,215,0,0.05)',
          pointerEvents: 'none', zIndex: 5,
        }} />
        <div style={{
          position: 'absolute', left: centerX + '%', top: centerY + '%',
          transform: 'translate(-50%, -50%)',
          width: (orbitRadius * 1.3) + '%',
          height: (orbitRadius * 0.95) + '%',
          borderRadius: '50%',
          border: '1px solid rgba(139,92,246,0.06)',
          pointerEvents: 'none', zIndex: 5,
        }} />

        {/* Чёрная дыра (центр притяжения) */}
        <div style={{
          position: 'absolute', left: centerX + '%', top: centerY + '%',
          transform: 'translate(-50%, -50%)', width: '90px', height: '90px', zIndex: 6
        }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,0,0.4) 0%, rgba(255,100,0,0.2) 30%, transparent 60%)', filter: 'blur(14px)', animation: 'orbitSpin 10s linear infinite' }} />
          <div style={{ position: 'absolute', top: '-5%', left: '-5%', width: '110%', height: '110%', borderRadius: '50%', background: 'radial-gradient(circle at 45% 45%, rgba(255,200,100,0.5) 0%, rgba(200,100,255,0.2) 40%, transparent 70%)', filter: 'blur(10px)', animation: 'orbitSpin 8s linear infinite reverse' }} />
          <div style={{ position: 'absolute', top: '15%', left: '15%', width: '70%', height: '70%', borderRadius: '50%', background: 'radial-gradient(circle, #000 0%, #0a0a0a 40%, transparent 80%)', boxShadow: '0 0 40px rgba(255,215,0,0.5), 0 0 80px rgba(255,180,0,0.25)', filter: 'blur(2px)', animation: 'blackHoleBreath 6s ease-in-out infinite' }} />
        </div>

        {/* Орбитальные кнопки (8 штук равномерно) */}
        {blocks.map((block) => {
          const [c1, c2] = block.colors
          const handleClick = () => router.push(block.path)
          return (
            <div
              key={block.idx}
              style={{
                position: 'absolute',
                left: block.left + '%',
                top: block.top + '%',
                transform: 'translate(-50%, -50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                cursor: 'pointer', zIndex: 10,
                animation: `floatBlock ${8 + block.idx * 0.5}s ease-in-out infinite alternate`,
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onClick={handleClick}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.15)';
                const halo = e.currentTarget.querySelector('.block-halo')
                if (halo) halo.style.opacity = '1'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                const halo = e.currentTarget.querySelector('.block-halo')
                if (halo) halo.style.opacity = '0.5'
              }}
            >
              {/* Орбитальные частицы вокруг кнопки */}
              <OrbitParticles colors={block.colors} />

              {/* Пульсирующий ореол */}
              <div className="block-halo" style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '70px', height: '70px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${c1}40 0%, transparent 70%)`,
                opacity: 0.5,
                animation: `haloPulse 3s ease-in-out ${block.idx * 0.3}s infinite`,
                filter: 'blur(8px)',
                pointerEvents: 'none',
              }} />

              {/* Заголовок с мерцающим градиентом */}
              <div style={{
                fontSize: '17px', fontWeight: 600, lineHeight: 1.2, marginBottom: '4px',
                background: `linear-gradient(135deg, ${c1}, ${c2}, ${c1})`,
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 12px rgba(192,132,252,0.7))',
                textAlign: 'center',
                animation: 'shimmerText 3s ease-in-out infinite',
              }}>
                {block.title}
              </div>
              <div style={{
                fontSize: '12px', fontWeight: 300, color: 'rgba(234,240,251,0.75)',
                filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.4))',
                textAlign: 'center', letterSpacing: '0.5px',
              }}>
                {block.sub}
              </div>
            </div>
          )
        })}

        {/* === БЛОК БАЛАНСА (слева вверху, переделан) === */}
        <div style={{
          position: 'absolute', left: '4%', top: '4%',
          zIndex: 20,
          animation: 'driftBalance 25s ease-in-out infinite alternate',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '24px 32px',
          background: 'rgba(10,15,30,0.4)',
          backdropFilter: 'blur(16px)',
          borderRadius: '20px',
          border: '1px solid rgba(255,215,0,0.15)',
          boxShadow: '0 0 40px rgba(255,215,0,0.08), inset 0 0 20px rgba(160,233,255,0.03)',
        }}>
          {/* Тонкая надпись "Баланс" */}
          <div style={{
            fontSize: 10, fontWeight: 300, letterSpacing: 4, textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 8,
            fontFamily: 'Inter, sans-serif',
          }}>
            Баланс
          </div>

          {/* Цифра */}
          <div style={{
            fontSize: 52, fontWeight: 600, lineHeight: 1,
            fontFamily: 'Inter, sans-serif',
            background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6, #ffe29f, #b3f0ff)',
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 12px rgba(100,200,255,0.8)) drop-shadow(0 0 25px rgba(255,150,200,0.6))',
            animation: 'rainbowShift 4s ease-in-out infinite alternate',
            marginBottom: 4,
          }}>
            {balance}
          </div>

          {/* Слово "кармиков" */}
          <div style={{
            fontSize: 12, fontWeight: 300,
            fontFamily: 'Inter, sans-serif',
            color: 'rgba(255,255,255,0.7)',
            textShadow: '0 0 8px rgba(100,200,255,0.5)',
            letterSpacing: 2,
            marginBottom: 20,
          }}>
            {karmikWord}
          </div>

          {/* Разделительная линия */}
          <div style={{
            width: '60%', height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.3), transparent)',
            marginBottom: 18,
          }} />

          {/* Две кнопки под балансом */}
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {[
              { label: 'История', path: '/history', color: '#ffb3c6' },
              { label: 'Перевести', path: '/transfer', color: '#a0e9ff' },
            ].map((btn, idx) => (
              <div key={idx} style={{ textAlign: 'center', cursor: 'pointer' }}
                onClick={() => router.push(btn.path)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = btn.color;
                  e.currentTarget.style.textShadow = `0 0 12px ${btn.color}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                  e.currentTarget.style.textShadow = '0 0 5px rgba(100,200,255,0.3)';
                }}
              >
                <div style={{
                  fontSize: 12, fontWeight: 400, letterSpacing: 1,
                  color: 'rgba(255,255,255,0.55)',
                  transition: 'all 0.3s ease',
                  marginBottom: 6,
                }}>
                  {btn.label}
                </div>
                <div style={{
                  width: 3, height: 3, borderRadius: '50%',
                  background: btn.color, margin: '0 auto',
                  boxShadow: `0 0 6px ${btn.color}`,
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
        @keyframes orbitSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes blackHoleBreath {
          0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(255,215,0,0.5), 0 0 80px rgba(255,180,0,0.25); }
          50% { transform: scale(1.08); box-shadow: 0 0 60px rgba(255,215,0,0.7), 0 0 100px rgba(255,180,0,0.4); }
        }
        @keyframes floatBlock {
          0% { transform: translate(-50%, -50%) translate(0, 0); }
          100% { transform: translate(-50%, -50%) translate(6px, -6px); }
        }
        @keyframes haloPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.7; }
        }
        @keyframes orbitParticle {
          0% { transform: translate(-50%, -50%) rotate(0deg) translateX(var(--r, 26px)) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg) translateX(var(--r, 26px)) rotate(-360deg); }
        }
        @keyframes shimmerText {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shootingStar {
          0% { opacity: 0; transform: rotate(var(--angle, 30deg)) translateX(-50px); }
          10% { opacity: 1; }
          100% { opacity: 0; transform: rotate(var(--angle, 30deg)) translateX(200px); }
        }
        @keyframes nebulaDrift1 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.7; }
          100% { transform: translate(10%, 5%) scale(1.1); opacity: 1; }
        }
        @keyframes nebulaDrift2 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          100% { transform: translate(-8%, -6%) scale(1.15); opacity: 0.9; }
        }
        @keyframes nebulaDrift3 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          100% { transform: translate(12%, -8%) scale(1.2); opacity: 0.8; }
        }
        @keyframes accretionDiskSpin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes driftBalance {
          0% { transform: translate(0, 0); }
          100% { transform: translate(5px, -5px); }
        }
        @keyframes rainbowShift {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
    </>
  )
}
