import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'
import PremiumModal from '../components/PremiumModal'
import LoadingScreen from '../components/LoadingScreen'
import BackArrow from '../components/BackArrow'

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
  const [purchaseCounts, setPurchaseCounts] = useState({})
  const [modal, setModal] = useState({ show: false, message: '', type: '' })
  const [loading, setLoading] = useState(false)
  const [selectedReward, setSelectedReward] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [unlockedKeys, setUnlockedKeys] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Профиль обязателен: без него неизвестно, к какой компании
      // принадлежит пользователь, и показывать магазин нельзя (утечка
      // товаров между компаниями). Если профиля нет — уводим на /welcome,
      // где есть корректная обработка (ожидание приглашения/сообщение админу).
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, deleted_at')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile?.company_id || profile.deleted_at) {
        router.push('/welcome')
        return
      }

      setUser(user)
      const { data: bal } = await supabase.from('karma_balance').select('balance').eq('user_id', user.id).single()
      if (bal) setBalance(bal.balance)

      // rewards теперь корректно скопированы по company_id (миграция и
      // RLS-политика "Company members can view own rewards" применены).
      const { data: rewardsData } = await supabase
        .from('rewards')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('cost')
      setRewards(rewardsData || [])
      // Лимит покупок на человека (limit_per_user) раньше нигде визуально
      // не учитывался — сотрудник видел кнопку «Купить» даже если уже
      // выбрал весь доступный лимит. Считаю через PostgREST-эмбеддинг
      // rewards(id), а не через прямое имя колонки-внешнего ключа на
      // purchases, которое нигде в проекте явно не встречается.
      const { data: purchasesData } = await supabase.from('purchases').select('rewards(id)').eq('user_id', user.id)
      const counts = {}
      ;(purchasesData || []).forEach(p => { const id = p.rewards?.id; if (id) counts[id] = (counts[id] || 0) + 1 })
      setPurchaseCounts(counts)
      // Партнёрские товары (п.11 ТЗ) — какие ключи разблокировки уже
      // открыты у сотрудника, чтобы показать замок на остальных.
      const { data: unlocks } = await supabase.from('employee_unlocks').select('unlock_key').eq('user_id', user.id)
      setUnlockedKeys((unlocks || []).map(u => u.unlock_key))
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

  if (initialLoading) return <LoadingScreen />

  const featuredRewards = rewards.filter(r => r.is_featured || r.promo_label)
  const partnerNames = [...new Set(rewards.filter(r => r.partner_name).map(r => r.partner_name))]
  const visibleRewards = activeCategory === 'all' ? rewards : rewards.filter(r => r.partner_name === activeCategory)

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'transparent', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      <Head><title>Магазин | Кармический банк</title></Head>

      {/* Контент */}
      <div style={{ position: 'relative', zIndex: 2, padding: '24px 30px 0', height: '100vh', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Верхняя строка: стрелка назад + заголовок + баланс */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ marginBottom: 0 }}>
              <BackArrow href="/" title="Магазин" />
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

          {/* Лента акций и топ-товаров — как в маркетплейсах (п.12 ТЗ) */}
          {featuredRewards.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" /></svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#FFD700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Акции и топ товары</span>
              </div>
              <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 10, scrollSnapType: 'x mandatory' }}>
                {featuredRewards.map(reward => (
                  <div key={reward.id} onClick={() => setSelectedReward(reward)} style={{
                    flex: '0 0 240px', scrollSnapAlign: 'start', cursor: 'pointer', borderRadius: 18, overflow: 'hidden',
                    background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.25)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.35)', transition: 'transform 0.25s'
                  }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}>
                    <div style={{ height: 120, position: 'relative' }}>
                      {reward.image_url ? <img src={reward.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1E1B4B, #1A1A2E)' }} />}
                      {reward.promo_label && <span style={{ position: 'absolute', top: 10, left: 10, background: 'linear-gradient(135deg, #f87171, #c084fc)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{reward.promo_label}</span>}
                    </div>
                    <div style={{ padding: 14 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reward.name}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#FFD700' }}>{reward.cost} {getKarmikWord(reward.cost)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Категории от партнёров (п.11-12 ТЗ) */}
          {partnerNames.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              <button onClick={() => setActiveCategory('all')} className={`filter-pill ${activeCategory === 'all' ? 'active' : ''}`}>Все товары</button>
              {partnerNames.map(name => (
                <button key={name} onClick={() => setActiveCategory(name)} className={`filter-pill ${activeCategory === name ? 'active' : ''}`}>{name}</button>
              ))}
            </div>
          )}

          {/* Сетка карточек */}
          {visibleRewards.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#777', padding: '60px 0' }}>В этой категории пока нет товаров</div>
          ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 30,
            marginTop: 16,
            paddingBottom: 40
          }}>
            {visibleRewards.map(reward => {
              const word = getKarmikWord(reward.cost)
              const isLocked = !!reward.requires_unlock && !unlockedKeys.includes(reward.requires_unlock)
              const bought = purchaseCounts[reward.id] || 0
              const limitReached = reward.limit_per_user > 0 && bought >= reward.limit_per_user
              return (
                <div key={reward.id} style={{
                  background: 'rgba(15, 20, 35, 0.8)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 24,
                  overflow: 'hidden',
                  border: isLocked ? '1px solid rgba(192,132,252,0.35)' : '1px solid rgba(255,255,255,0.08)',
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
                      <img src={reward.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isLocked ? 'grayscale(0.7) brightness(0.5)' : 'none' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1E1B4B, #1A1A2E)' }} />
                    )}
                    <span style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', color: '#FFD700', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>
                      {typeLabels[reward.type] || 'Товар'}
                    </span>
                    {reward.requires_approval && (
                      <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,0,0,0.5)', backdropFilter: 'blur(4px)', color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>Требуется согласование</span>
                    )}
                    {isLocked && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(10,10,20,0.35)' }}>
                        <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(192,132,252,0.15)', border: '1px solid rgba(192,132,252,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                        </span>
                        <span style={{ fontSize: 11, color: '#e9d5ff', textAlign: 'center', padding: '0 16px' }}>Откроется после партнёрского задания</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '20px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 10 }}>{reward.name}</h3>
                    <p style={{ fontSize: 14, color: '#aaa', marginBottom: 20, lineHeight: 1.6, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{reward.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <span style={{ fontSize: 18, fontWeight: 600, color: '#FFD700' }}>{reward.cost} {word}</span>
                      {isLocked ? (
                        <span style={{ fontSize: 12, color: '#c084fc', padding: '10px 18px', border: '1px solid rgba(192,132,252,0.4)', borderRadius: 14 }}>Заблокировано</span>
                      ) : limitReached ? (
                        <span style={{ fontSize: 12, color: '#4ade80', padding: '10px 18px', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                          Уже куплено
                        </span>
                      ) : (
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
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          )}
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
            }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg></button>

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
                  {selectedReward.requires_unlock && !unlockedKeys.includes(selectedReward.requires_unlock) ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#c084fc', padding: '14px 24px', border: '1px solid rgba(192,132,252,0.4)', borderRadius: 14 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                      Откроется после партнёрского задания
                    </span>
                  ) : (purchaseCounts[selectedReward.id] || 0) >= selectedReward.limit_per_user && selectedReward.limit_per_user > 0 ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4ade80', padding: '14px 24px', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 14 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                      Уже куплено
                    </span>
                  ) : (
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
                  )}
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
