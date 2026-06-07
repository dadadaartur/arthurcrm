import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'

function getKarmikWord(n) {
  const lastDigit = n % 10
  const lastTwoDigits = n % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'кармиков'
  if (lastDigit === 1) return 'кармик'
  if (lastDigit >= 2 && lastDigit <= 4) return 'кармика'
  return 'кармиков'
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [tasks, setTasks] = useState([])          // реальные задания
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      // Баланс
      const { data: bal } = await supabase.from('karma_balance').select('balance').eq('user_id', user.id).single()
      if (bal) setBalance(bal.balance)

      // Активные задания (только последние 6 штук, чтобы не перегружать экран)
      const { data: taskAssignments } = await supabase
        .from('task_assignments')
        .select('id, status, deadline_at, tasks( id, title, reward_karma )')
        .eq('user_id', user.id)
        .in('status', ['assigned', 'in_progress', 'pending_review'])
        .order('deadline_at', { ascending: true })
        .limit(6)

      if (taskAssignments) setTasks(taskAssignments)
      setLoading(false)
    }
    init()
  }, [])

  const karmikWord = getKarmikWord(balance)

  // Превращаем задания в парящие блоки
  const taskBlocks = tasks.map((a, idx) => ({
    title: a.tasks?.title || 'Задание',
    sub: a.tasks ? `+${a.tasks.reward_karma} ${getKarmikWord(a.tasks.reward_karma)}` : '',
    colors: ['#7AC78F', '#c084fc'],
    left: 20 + idx * 10,   // распределим по горизонтали
    top: 15 + idx * 8
  }))

  // Если заданий меньше 6, дополним заглушками, чтобы сохранить расстановку
  const placeholderBlocks = [
    { title: 'Магазин', sub: 'награды', left: 18, top: 75, colors: ['#f97316', '#F28B82'] },
    { title: 'Чат', sub: 'общение', left: 45, top: 78, colors: ['#c084fc', '#7AC78F'] },
    { title: 'История', sub: 'операции', left: 70, top: 75, colors: ['#d4af37', '#A3E0B0'] }
  ]

  const allBlocks = [...taskBlocks, ...placeholderBlocks]

  const centerX = 50
  const centerY = 42

  const beams = allBlocks.map(block => {
    const dx = block.left - centerX
    const dy = block.top - centerY
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    const length = Math.sqrt(dx * dx + dy * dy) * 0.55
    return { angle, length }
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="spinner" />
      </div>
    )
  }

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

        {/* Космическое свечение */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
          <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 100%, rgba(255,100,50,0.5) 0%, rgba(255,100,50,0.2) 40%, transparent 75%)', animation: 'breathe1 12s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: 0, left: '-10%', width: '120%', height: '100%', background: 'radial-gradient(ellipse at 30% 100%, rgba(255,100,150,0.4) 0%, transparent 70%)', filter: 'blur(8px)', animation: 'breathe2 16s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: 0, right: '-10%', width: '120%', height: '100%', background: 'radial-gradient(ellipse at 70% 100%, rgba(130,100,255,0.4) 0%, transparent 70%)', filter: 'blur(10px)', animation: 'breathe3 20s ease-in-out infinite alternate' }} />
        </div>

        {/* Чёрная дыра баланса */}
        <div className="balance-card" style={{ position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%, -50%)', zIndex: 5 }}>
          <div className="black-hole" />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div className="text-sm font-bold text-yellow-500 mb-2">Баланс</div>
            <div className="text-5xl font-extrabold text-yellow-400 mb-2" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundImage: 'linear-gradient(180deg, #FFD700, #C5A04E)' }}>
              {balance}
            </div>
            <div className="text-sm font-bold text-yellow-500">{karmikWord}</div>
          </div>
        </div>

        {/* Лучи-рукава */}
        {beams.map((beam, idx) => (
          <div key={`beam-${idx}`} style={{
            position: 'absolute', left: `${centerX}%`, top: `${centerY}%`,
            width: `${beam.length}%`, height: '2px',
            background: `linear-gradient(90deg, rgba(255,200,50,0) 0%, rgba(255,180,0,0.2) 30%, rgba(255,140,0,0.35) 60%, transparent 100%)`,
            transform: `rotate(${beam.angle}deg)`, transformOrigin: '0 0',
            filter: 'blur(4px)',
            animation: `beamPulse ${4 + idx % 3}s ease-in-out infinite alternate ${idx * 0.3}s`,
            pointerEvents: 'none',
            zIndex: 6
          }} />
        ))}

        {/* Парящие задания и разделы */}
        {allBlocks.map((block, idx) => (
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
              fontSize: '24px', fontWeight: 700, lineHeight: 1.2, marginBottom: '4px',
              background: `linear-gradient(135deg, ${block.colors[0]}, ${block.colors[1]})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 12px rgba(192,132,252,0.6))',
              textAlign: 'center'
            }}>
              {block.title}
            </div>
            {block.sub && (
              <div style={{
                fontSize: '14px', fontWeight: 400, color: '#eaf0fb',
                filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.5))',
                opacity: 0.85, letterSpacing: '0.3px', textAlign: 'center'
              }}>
                {block.sub}
              </div>
            )}
          </div>
        ))}

        {/* Кнопки действий (Перевести, Магазин, Операции) */}
        <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '12px', zIndex: 20 }}>
          <button onClick={() => router.push('/transfer')} className="action-btn">Перевести</button>
          <button onClick={() => router.push('/shop')} className="action-btn">Магазин</button>
          <button onClick={() => router.push('/history')} className="action-btn">Операции</button>
          <button onClick={() => router.push('/my-purchases')} className="wide-btn">Мои покупки</button>
        </div>

        {/* Шапка */}
        <header className="flex justify-between items-center px-6 py-2 absolute top-0 left-0 right-0 z-20 bg-transparent">
          <Link href="/" className="text-base font-bold bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
            Кармический банк
          </Link>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link href="/profile" className="text-white hover:text-gold transition-colors">
              {user?.email}
            </Link>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="action-btn !py-1.5 !px-4 !text-xs">Выйти</button>
          </div>
        </header>
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
        @keyframes beamPulse {
          0% { opacity: 0.2; }
          100% { opacity: 0.55; }
        }
        @keyframes drift0 {
          0% { transform: translate(-50%, -50%) translateX(-20px) translateY(8px); }
          100% { transform: translate(-50%, -50%) translateX(20px) translateY(-8px); }
        }
        @keyframes drift1 {
          0% { transform: translate(-50%, -50%) translateX(15px) translateY(-12px); }
          100% { transform: translate(-50%, -50%) translateX(-15px) translateY(12px); }
        }
        @keyframes drift2 {
          0% { transform: translate(-50%, -50%) translateX(-18px) translateY(-10px); }
          100% { transform: translate(-50%, -50%) translateX(18px) translateY(10px); }
        }
      `}</style>
    </>
  )
}
