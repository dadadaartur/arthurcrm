import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'
import PremiumModal from '../components/PremiumModal'

export default function Shop() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [rewards, setRewards] = useState([])
  const [modal, setModal] = useState({ show: false, message: '', type: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: bal } = await supabase.from('karma_balance').select('balance').eq('user_id', user.id).single()
      if (bal) setBalance(bal.balance)
      const { data: rewardsData } = await supabase.from('rewards').select('*').order('cost')
      setRewards(rewardsData || [])
    }
    init()
  }, [])

  const purchase = async (reward) => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    if (!accessToken) {
      setModal({ show: true, message: 'Не удалось получить токен доступа', type: 'error' })
      setLoading(false)
      return
    }
    const res = await fetch('/api/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ rewardId: reward.id })
    })
    const result = await res.json()
    if (res.ok) {
      setBalance(result.newBalance)
      setModal({ show: true, message: result.message || `Вы приобрели "${reward.name}"`, type: 'success' })
    } else {
      setModal({ show: true, message: result.error || 'Ошибка', type: 'error' })
    }
    setLoading(false)
  }

  // Фон как на главной (звёзды + переливы)
  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      <Head><title>Магазин | Кармический банк</title></Head>

      {/* Звёзды */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        {Array.from({ length: 100 }).map((_, i) => {
          const size = Math.random() * 2.5 + 0.5
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

      {/* Переливы */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
        <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 100%, rgba(255,100,50,0.5) 0%, rgba(255,100,50,0.2) 40%, transparent 75%)', animation: 'breathe1 12s ease-in-out infinite alternate' }} />
      </div>

      {/* Контент */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Магазин наград</h1>
          <div style={{ fontSize: 18, color: '#FFD700' }}>Баланс: {balance} кармиков</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {rewards.map(reward => (
            <div key={reward.id} style={{
              background: 'rgba(15, 20, 35, 0.8)',
              backdropFilter: 'blur(10px)',
              borderRadius: 20,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              transition: 'transform 0.3s, box-shadow 0.3s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,180,0,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; }}
            >
              <div style={{ width: '100%', height: 180, background: reward.image_url ? `url(${reward.image_url}) center/cover` : 'linear-gradient(135deg, #1E1B4B, #1A1A2E)', position: 'relative' }}>
                {reward.type === 'digital' && (
                  <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: '#FFD700', padding: '4px 8px', borderRadius: 8, fontSize: 12 }}>Сертификат</span>
                )}
                {reward.requires_approval && (
                  <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,0,0,0.6)', color: '#fff', padding: '4px 8px', borderRadius: 8, fontSize: 12 }}>Требуется согласование</span>
                )}
              </div>
              <div style={{ padding: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{reward.name}</h3>
                <p style={{ fontSize: 14, color: '#ccc', marginBottom: 16, lineHeight: 1.5 }}>{reward.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#FFD700' }}>{reward.cost} к.</span>
                  <button onClick={() => purchase(reward)} disabled={loading} style={{
                    background: 'linear-gradient(135deg, #f97316, #e65c00)',
                    border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 10,
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    transition: 'opacity 0.2s'
                  }}>Купить</button>
                </div>
                {/* Место для рейтинга (позже) */}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PremiumModal isOpen={modal.show} onClose={() => setModal({ ...modal, show: false })} title={modal.type === 'success' ? 'Успешно' : 'Ошибка'}>
        <p style={{ color: '#fff' }}>{modal.message}</p>
      </PremiumModal>
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes breathe1 {
          0% { opacity: 0.7; transform: scaleY(1); }
          100% { opacity: 1; transform: scaleY(1.15); }
        }
      `}</style>
    </div>
  )
}
