import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import PremiumModal from '../components/PremiumModal'
import Spinner from '../components/Spinner'

function getKarmikWord(n) {
  const lastDigit = n % 10
  const lastTwoDigits = n % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'кармиков'
  if (lastDigit === 1) return 'кармик'
  if (lastDigit >= 2 && lastDigit <= 4) return 'кармика'
  return 'кармиков'
}

const typeLabels = {
  digital: 'Сертификат',
  workplace: 'Рабочее место',
  delivery: 'Доставка домой',
  promocode: 'Промокод',
}

export default function Shop() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [rewards, setRewards] = useState([])
  const [modal, setModal] = useState({ show: false, message: '', type: '' })
  const [loading, setLoading] = useState(false)
  const [selectedReward, setSelectedReward] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: bal } = await supabase.from('karma_balance').select('balance').eq('user_id', user.id).single()
      if (bal) setBalance(bal.balance)
      const { data: rewardsData } = await supabase.from('rewards').select('*').order('cost')
      setRewards(rewardsData || [])
      setInitialLoading(false)
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

  if (initialLoading) return <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>

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
      <div style={{ position: 'relative', zIndex: 2, padding: '24px 30px 0', height: '100vh', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Верхняя строка: стрелка назад + заголовок + баланс */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Маленькая градиентная стрелка */}
              <Link href="/" style={{
                fontSize: 28,
                fontWeight: 400,
                background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textDecoration: 'none',
                lineHeight: 1,
                transition: 'opacity 0.2s',
                opacity: 0.8
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
              >
                ←
              </Link>
              <h1 style={{
                fontSize: 24,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0
              }}>
                Магазин
              </h1>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(16px)',
              borderRadius: 50,
              padding: '8px 24px',
              border: '1px solid rgba(255,215,0,0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 0 20px rgba(255,200,0,0.1)'
            }}>
              <span style={{ fontSize: 14, color: '#aaa', fontWeight: 400 }}>Баланс</span>
              <span style={{
                fontSize: 20,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 8px rgba(255,200,0,0.5))'
              }}>
                {balance}
              </span>
              <span style={{ fontSize: 13, color: '#FFD700', fontWeight: 400 }}>кармиков</span>
            </div>
          </div>

          {/* Сетка карточек */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 30,
            marginTop: 16,
            paddingBottom: 40
          }}>
            {rewards.map(reward => {
              const word = getKarmikWord(reward.cost)
              return (
                <div key={reward.id} style={{
                  background: 'rgba(15, 20, 35, 0.8)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 24,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(255,180,0,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)'; }}
                onClick={() => setSelectedReward(reward)}
                >
                  <div style={{ width: '100%', height: 220, position: 'relative', overflow: 'hidden' }}>
                    {reward.image_url ? (
                      <img src={reward.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1E1B4B, #1A1A2E)' }} />
                    )}
                    <span style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', color: '#FFD700', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>
                      {typeLabels[reward.type] || 'Товар'}
                    </span>
                    {reward.requires_approval && (
                      <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,0,0,0.5)', backdropFilter: 'blur(4px)', color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>Требуется согласование</span>
                    )}
                  </div>
                  <div style={{ padding: '20px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 10 }}>{reward.name}</h3>
                    <p style={{ fontSize: 14, color: '#aaa', marginBottom: 20, lineHeight: 1.6, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{reward.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <span style={{ fontSize: 18, fontWeight: 600, color: '#FFD700' }}>{reward.cost} {word}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); purchase(reward); }}
                        disabled={loading}
                        style={{
                          background: 'linear-gradient(135deg, rgba(160,233,255,0.2), rgba(255,179,198,0.2), rgba(255,226,159,0.2))',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255,255,255,0.3)',
                          borderRadius: 14,
                          padding: '10px 24px',
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          textShadow: '0 0 10px rgba(255,255,255,0.5)',
                          animation: 'subtleGlow 3s ease-in-out infinite'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(160,233,255,0.4), rgba(255,179,198,0.4), rgba(255,226,159,0.4))';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)';
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(255,255,255,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(160,233,255,0.2), rgba(255,179,198,0.2), rgba(255,226,159,0.2))';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        Купить
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Полноэкранный просмотр товара */}
      {selectedReward && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20
        }} onClick={() => setSelectedReward(null)}>
          <div style={{
            background: 'rgba(15, 20, 35, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 32,
            border: '1px solid rgba(255,215,0,0.2)',
            padding: 40,
            maxWidth: 900,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: 30
          }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedReward(null)} style={{
              alignSelf: 'flex-end',
              background: 'none',
              border: 'none',
              color: '#aaa',
              fontSize: 24,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1
            }}>✕</button>

            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
              {selectedReward.image_url && (
                <div style={{ flex: '1 1 350px', maxWidth: 450 }}>
                  <img
                    src={selectedReward.image_url}
                    alt=""
                    style={{ width: '100%', borderRadius: 20, objectFit: 'cover', maxHeight: '60vh' }}
                  />
                </div>
              )}
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(4px)',
                  color: '#FFD700',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 13,
                  marginBottom: 12,
                  alignSelf: 'flex-start'
                }}>
                  {typeLabels[selectedReward.type] || 'Товар'}
                </span>
                <h2 style={{
                  fontSize: 32,
                  fontWeight: 700,
                  marginBottom: 16,
                  background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {selectedReward.name}
                </h2>
                <p style={{ fontSize: 16, color: '#bbb', lineHeight: 1.7, marginBottom: 24 }}>
                  {selectedReward.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 'auto' }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: '#FFD700' }}>
                    {selectedReward.cost} {getKarmikWord(selectedReward.cost)}
                  </span>
                  <button
                    onClick={() => { purchase(selectedReward); }}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, rgba(160,233,255,0.2), rgba(255,179,198,0.2), rgba(255,226,159,0.2))',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: 14,
                      padding: '14px 36px',
                      fontSize: 16,
                      fontWeight: 500,
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      textShadow: '0 0 10px rgba(255,255,255,0.5)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(160,233,255,0.4), rgba(255,179,198,0.4), rgba(255,226,159,0.4))';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(255,255,255,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(160,233,255,0.2), rgba(255,179,198,0.2), rgba(255,226,159,0.2))';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Купить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
        @keyframes subtleGlow {
          0% { box-shadow: 0 0 5px rgba(0,255,100,0.2); }
          50% { box-shadow: 0 0 12px rgba(0,255,100,0.4); }
          100% { box-shadow: 0 0 5px rgba(0,255,100,0.2); }
        }
        *::-webkit-scrollbar { width: 0; height: 0; }
        * { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
    </div>
  )
}
