import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
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
  const [purchaseMode, setPurchaseMode] = useState(null)
  const [activationDate, setActivationDate] = useState('')
  const [activationComment, setActivationComment] = useState('')
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

  // ... остальные функции purchase, openPurchaseModal, handleBuyNow, handleBuyLater без изменений
  // (возьмите из последней полной версии shop.js выше)

  if (initialLoading) return <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      {/* ... звёзды, переливы ... */}
      <div style={{ position: 'relative', zIndex: 2, padding: '40px 30px', height: '100vh', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* заголовок и баланс */}
          {/* сетка карточек */}
          {rewards.map(reward => {
            const word = getKarmikWord(reward.cost)
            return (
              <div key={reward.id} style={{ /* ... стили карточки */ }}>
                {/* ... */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: '#FFD700' }}>{reward.cost} {word}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); openPurchaseModal(reward); }}
                    disabled={loading}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,215,0,0.25)',
                      borderRadius: 14,
                      padding: '10px 24px',
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#FFD700',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      textShadow: '0 0 10px rgba(255,200,0,0.5)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                      e.currentTarget.style.borderColor = '#FFD700';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(255,200,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.borderColor = 'rgba(255,215,0,0.25)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Купить
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {/* ... модалки ... */}
    </div>
  )
}
