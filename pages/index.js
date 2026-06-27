import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import { useProfile } from '../context/ProfileContext'

function getKarmikWord(n) {
  const lastDigit = n % 10
  const lastTwoDigits = n % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'кармиков'
  if (lastDigit === 1) return 'кармик'
  if (lastDigit >= 2 && lastDigit <= 4) return 'кармика'
  return 'кармиков'
}

// ============ Обновлённый лендинг ============
function CorporateLanding() {
  const router = useRouter()
  const { user } = useProfile()

  return (
    <div className="landing-wrapper min-h-screen bg-black text-white overflow-x-hidden">
      <Head>
        <title>Кармический Банк | Экосистема Роста</title>
      </Head>

      {/* ФОН СО ЗВЕЗДАМИ И ГРАДИЕНТАМИ */}
      <div className="stars-bg">
        <div className="gradient-aura" />
      </div>

      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 px-8 py-5 flex justify-between items-center backdrop-blur-md">
        <div className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
          Кармический банк
        </div>
        {user ? (
          <button
            onClick={() => router.push('/')}
            className="text-sm font-medium text-white/70 hover:text-white transition-colors px-5 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm"
          >
            Вернуться в систему
          </button>
        ) : (
          <button
            onClick={() => router.push('/login')}
            className="text-sm font-medium text-white/70 hover:text-white transition-colors px-5 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm"
          >
            Войти
          </button>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 flex flex-col items-center text-center px-4">
        {/* Чёрная дыра как на главной */}
        <div className="hero-black-hole mb-12" style={{ position: 'relative', width: 180, height: 180 }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 180, height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,180,0,0.4) 0%, rgba(255,100,0,0.2) 30%, transparent 60%)',
            filter: 'blur(14px)',
            animation: 'orbitSpin 10s linear infinite'
          }} />
          <div style={{
            position: 'absolute', top: '-5%', left: '-5%',
            width: '110%', height: '110%',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 45% 45%, rgba(255,200,100,0.5) 0%, rgba(200,100,255,0.2) 40%, transparent 70%)',
            filter: 'blur(10px)',
            animation: 'orbitSpin 8s linear infinite reverse'
          }} />
          <div className="black-hole" style={{ width: 180, height: 180, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tighter leading-tight">
          Превратите KPI в <br />
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-600 bg-clip-text text-transparent">
            энергию созидания
          </span>
        </h1>

        <p className="max-w-2xl text-gray-400 text-lg md:text-xl mb-10">
          Первая в мире галактическая экосистема лояльности, где каждый звонок, сделка и идея превращаются в реальную валюту внутри вашей компании.
        </p>

        <div className="flex gap-6">
          <button onClick={() => router.push('/create-company')} className="btn-gold !text-lg !py-4 !px-12 animate-pulse">
            Создать компанию
          </button>
        </div>
      </section>

      {/* ЦИФРЫ / АРГУМЕНТЫ ДЛЯ ДИРЕКТОРА */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-6 py-20 relative z-10">
        <div className="dash-card">
          <h3 className="!text-3xl text-gold">+40%</h3>
          <p className="text-sm text-gray-300">К вовлеченности сотрудников за счет мгновенной геймификации достижений.</p>
        </div>
        <div className="dash-card">
          <h3 className="!text-3xl text-gold">0%</h3>
          <p className="text-sm text-gray-300">Текучки кадров. Ваши таланты не уходят — они развивают свои кармические профили.</p>
        </div>
        <div className="dash-card">
          <h3 className="!text-3xl text-gold">Авто</h3>
          <p className="text-sm text-gray-300">Интеграция с вашей CRM. Система сама начислит награду за закрытую сделку.</p>
        </div>
      </section>

      {/* "ПУТЬ К СОВЕРШЕНСТВУ" — УНИКАЛЬНЫЙ LORE */}
      <section className="py-20 bg-gray-900/30 backdrop-blur-xl border-y border-orange-500/20">
        <div className="max-w-6xl mx-auto px-10">
          <h2 className="text-4xl font-bold mb-16 text-center">Как работает Галактика?</h2>

          <div className="space-y-24">
            <div className="flex flex-col md:flex-row items-center gap-20">
              <div className="flex-1">
                <div className="text-gold text-sm uppercase tracking-widest mb-4">Этап I: Кристаллизация</div>
                <h4 className="text-3xl font-bold mb-6">Создайте правила своей Вселенной</h4>
                <p className="text-gray-400 leading-relaxed">
                  Назначайте кармическую награду за любые действия: от идеального звонка до помощи коллеге.
                  Ваша компания больше не просто офис — это игровая площадка для профессионалов.
                </p>
              </div>
              <div className="flex-1 w-full h-64 pastel-card flex items-center justify-center relative overflow-hidden">
                {/* Заглушка для картинки "Кристалл" */}
                <img
                  src="/images/landing-crystal.png"
                  alt="Кристаллизация"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row-reverse items-center gap-20">
              <div className="flex-1 text-right">
                <div className="text-gold text-sm uppercase tracking-widest mb-4">Этап II: Магазин Наград</div>
                <h4 className="text-3xl font-bold mb-6">Дайте им то, чего они реально хотят</h4>
                <p className="text-gray-400 leading-relaxed">
                  Забудьте о скучных премиях раз в год. Менеджер копит «кармики» и тут же тратит их на ужин в ресторане, мерч, день отдыха или обед с директором.
                </p>
              </div>
              <div className="flex-1 w-full h-64 dash-card flex items-center justify-center relative overflow-hidden">
                {/* Заглушка для картинки "Подарок" */}
                <img
                  src="/images/landing-gift.png"
                  alt="Магазин наград"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CALL TO ACTION */}
      <section className="py-32 flex flex-col items-center">
        <h2 className="text-4xl font-bold mb-8 text-center px-6">Ваша компания готова к квантовому скачку?</h2>
        <p className="text-gray-400 mb-12">Регистрация займет 2 минуты. Удивление команды — всю оставшуюся жизнь.</p>
        <button onClick={() => router.push('/create-company')} className="wide-btn !w-auto !px-20 !py-6 text-xl">
          Стать частью экосистемы
        </button>
      </section>

      <footer className="py-10 border-t border-white/5 text-center text-gray-600 text-xs">
        &copy; {new Date().getFullYear()} Кармический банк. Сделано в глубоком космосе для лучших команд.
      </footer>

      <style jsx>{`
        .hero-black-hole {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .gradient-aura {
          position: absolute;
          bottom: 0;
          width: 100%;
          height: 50%;
          background: radial-gradient(circle at center, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
        }
        .landing-wrapper {
          scroll-behavior: smooth;
        }
        @keyframes orbitSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ============ Главный компонент ============
export default function Home() {
  const { user, profile, loading } = useProfile()
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [stats, setStats] = useState({ active: 0, completed: 0, earned: 0 })
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setPageLoading(false)
      return
    }
    const loadData = async () => {
      const { data: bal } = await supabase.from('karma_balance').select('balance').eq('user_id', user.id).single()
      if (bal) setBalance(bal.balance)

      const { data: active } = await supabase
        .from('task_assignments')
        .select('status')
        .eq('user_id', user.id)
        .in('status', ['assigned', 'in_progress', 'pending_review'])

      const { data: completed } = await supabase
        .from('task_assignments')
        .select('status, tasks(reward_karma)')
        .eq('user_id', user.id)
        .eq('status', 'completed')

      const earned = completed?.reduce((sum, a) => sum + (a.tasks?.reward_karma || 0), 0) || 0
      setStats({ active: active?.length || 0, completed: completed?.length || 0, earned })
      setPageLoading(false)
    }
    loadData()
  }, [user])

  // Если загрузка профиля ещё идёт, ничего не показываем
  if (loading || pageLoading) return null

  // Неавторизованный пользователь видит лендинг
  if (!user) {
    return <CorporateLanding />
  }

  // Авторизованный пользователь видит основной интерфейс
  const karmikWord = getKarmikWord(balance)
  const centerX = 58
  const centerY = 40
  const blocks = [
    { title: 'Чемпионат', sub: 'менеджеров', left: 80, top: 40, colors: ['#7AC78F', '#c084fc'] },
    { title: 'Гороскоп',   sub: 'профессий',  left: 67.5, top: 61.7, colors: ['#c084fc', '#F28B82'] },
    { title: 'Журнал ПРО', sub: 'лучшие практики', left: 42.5, top: 61.7, colors: ['#c084fc', '#7AC78F'] },
    { title: 'Квиз',       sub: 'проверь себя', left: 35, top: 35, colors: ['#7AC78F', '#F28B82'] },
    { title: 'ИИ‑питомец', sub: 'учи и развивай', left: 42.5, top: 18.3, colors: ['#A3E0B0', '#d4af37'] },
    { title: 'Задания',    sub: '',             left: 67.5, top: 18.3, colors: ['#d4af37', '#A3E0B0'] }
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
      <Head>
        <title>Кармический банк</title>
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
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,0,0.4) 0%, rgba(255,100,0,0.2) 30%, transparent 60%)', filter: 'blur(14px)', animation: 'orbitSpin 10s linear infinite' }} />
          <div style={{ position: 'absolute', top: '-5%', left: '-5%', width: '110%', height: '110%', borderRadius: '50%', background: 'radial-gradient(circle at 45% 45%, rgba(255,200,100,0.5) 0%, rgba(200,100,255,0.2) 40%, transparent 70%)', filter: 'blur(10px)', animation: 'orbitSpin 8s linear infinite reverse' }} />
          <div style={{ position: 'absolute', top: '15%', left: '15%', width: '70%', height: '70%', borderRadius: '50%', background: 'radial-gradient(circle, #000 0%, #0a0a0a 40%, transparent 80%)', boxShadow: '0 0 30px rgba(255,215,0,0.4), 0 0 60px rgba(255,180,0,0.2)', filter: 'blur(2px)', animation: 'blackHoleBreath 6s ease-in-out infinite' }} />
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
          const handleClick = () => {
            if (block.title === 'Задания') router.push('/tasks')
          }
          return (
            <div key={idx} style={{
              position: 'absolute', left: `${block.left}%`, top: `${block.top}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              cursor: 'pointer', zIndex: 10,
              animation: `drift${idx % 3} ${8 + idx * 2}s ease-in-out infinite alternate`,
              transition: 'transform 0.3s'
            }}
            onClick={handleClick}
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

        {/* === НОВЫЙ БЛОК БАЛАНСА === */}
        <div style={{
          position: 'absolute',
          left: '2.5%',
          top: '2%',
          zIndex: 20,
          animation: 'driftBalance 25s ease-in-out infinite alternate'
        }}>
          {/* Ссылка на главную */}
          <Link href="/" style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 10, textDecoration: 'none' }}>
            На главную
          </Link>

          <div style={{
            fontSize: 48,
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6, #ffe29f, #b3f0ff)',
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 12px rgba(100,200,255,0.8)) drop-shadow(0 0 25px rgba(255,150,200,0.6))',
            animation: 'rainbowShift 4s ease-in-out infinite alternate',
            lineHeight: 1,
            marginBottom: 4,
            textAlign: 'center'
          }}>
            {balance}
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 300,
            fontFamily: 'Inter, sans-serif',
            color: 'rgba(255,255,255,0.85)',
            textShadow: '0 0 8px rgba(100,200,255,0.7), 0 0 16px rgba(255,150,200,0.5)',
            letterSpacing: 2,
            marginBottom: 20,
            textAlign: 'center'
          }}>
            {karmikWord}
          </div>

          <div style={{
            display: 'flex',
            gap: 28,
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {[
              { label: 'Перевести', path: '/transfer', color: '#a0e9ff' },
              { label: 'Операции', path: '/history', color: '#ffb3c6' },
              { label: 'Покупки', path: '/my-purchases', color: '#ffe29f' },
              { label: 'Магазин', path: '/shop', color: '#b3f0ff' }
            ].map((btn, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                <div
                  onClick={() => router.push(btn.path)}
                  style={{
                    fontSize: 13,
                    fontWeight: 400,
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    textShadow: '0 0 5px rgba(100,200,255,0.4)',
                    transition: 'all 0.3s ease',
                    marginBottom: 6
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = btn.color;
                    e.currentTarget.style.textShadow = `0 0 10px ${btn.color}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                    e.currentTarget.style.textShadow = '0 0 5px rgba(100,200,255,0.4)';
                  }}
                >
                  {btn.label}
                </div>
                <div style={{
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: btn.color,
                  margin: '0 auto',
                  boxShadow: `0 0 6px ${btn.color}`
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
