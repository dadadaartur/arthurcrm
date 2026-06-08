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

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [stats, setStats] = useState({ active: 0, completed: 0, earned: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

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
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <div className="flex justify-center items-center py-8"><div className="spinner" /></div>

  const karmikWord = getKarmikWord(balance)

  return (
    <>
      <Head>
        <title>Кармический банк</title>
      </Head>

      <div className="flex flex-col items-start px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8 w-full">
          {/* Левая колонка — баланс */}
          <div className="flex flex-col items-start" style={{ minWidth: '280px' }}>
            {/* Новый блок баланса */}
            <div style={{
              animation: 'driftBalance 25s ease-in-out infinite alternate',
              marginBottom: 30
            }}>
              {/* Цифра */}
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

              {/* Подпись "кармиков" */}
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

              {/* Кнопки — стройный ряд */}
              <div style={{
                display: 'flex',
                gap: 28,
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                {[
                  { label: 'Задания', path: '/tasks', color: '#a0e9ff' },
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
                    {/* Тонкий разделитель-точка */}
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

          {/* Правая колонка — статистика и ссылки */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="premium-card" style={{ background: 'linear-gradient(135deg, #1E1B4B, #1A1A2E)' }}>
              <h3 className="text-lg font-semibold text-white mb-4">Задания</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center"><p className="text-gray-400 text-sm">В работе</p><p className="text-2xl font-bold text-white">{stats.active}</p></div>
                <div className="text-center"><p className="text-gray-400 text-sm">Выполнено</p><p className="text-2xl font-bold text-green-400">{stats.completed}</p></div>
                <div className="text-center"><p className="text-gray-400 text-sm">Заработано</p><p className="text-2xl font-bold text-yellow-400">+{stats.earned}</p></div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="dash-card"><h3>Рейтинг</h3><p className="text-sm text-gray-400">Твоя позиция среди лучших</p></div>
              <div className="dash-card"><h3>Соревнования</h3><p className="text-sm text-gray-400">Докажи своё мастерство в битве</p></div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
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
