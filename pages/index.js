import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'

function getKarmikWord(n) {
  const lastDigit = n % 10
  const lastTwoDigits = n % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'кармиков'
  if (lastDigit === 1) return 'кармик'
  if (lastDigit >= 2 && lastDigit <= 4) return 'кармика'
  return 'кармиков'
}

export default function Home() {
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)
      const { data } = await supabase
        .from('karma_balance')
        .select('balance')
        .eq('user_id', user.id)
        .single()
      if (data) setBalance(data.balance)
      setLoading(false)
    }
    checkUser()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner />
      </div>
    )
  }

  const karmikWord = getKarmikWord(balance)
  const balanceStr = balance.toLocaleString()
  const dynamicFontSize = balanceStr.length > 5 ? '38px' :
                          balanceStr.length > 4 ? '48px' :
                          balanceStr.length > 3 ? '58px' : '68px'

  return (
    <div className="flex flex-col items-start px-6 py-8 space-y-10">
      {/* Блок баланса */}
      <div style={{
        background: '#0A0A0A',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        padding: '24px 28px',
        boxShadow: `
          0 0 0 2px rgba(197,160,78,.25),
          0 0 40px rgba(197,160,78,.2),
          0 0 80px rgba(197,160,78,.1),
          inset 0 2px 8px rgba(255,255,255,.08),
          inset 0 0 40px rgba(255,220,140,.03),
          inset 0 -4px 12px rgba(0,0,0,.35)
        `,
        width: '440px',
        position: 'relative',
        zIndex: 10,
        overflow: 'hidden'
      }}>
        {/* Верхний блик */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'linear-gradient(180deg, rgba(255,255,255,.05), transparent)',
          pointerEvents: 'none'
        }} />

        {/* Нимб + цифра + слово Баланс внутри */}
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '170px'
        }}>
          {/* Нимб (живой, с ярким свечением) */}
          <div style={{
            position: 'absolute',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, transparent 58%, rgba(197,160,78,.25) 70%, transparent 76%)',
            border: '1px solid rgba(197,160,78,.5)',
            animation: 'haloGlow 3s infinite ease-in-out',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }} />

          {/* Левая точка (рельефная) – отодвинута дальше */}
          <div style={{ position: 'absolute', left: '2px', display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #FFE484, #B8860B)',
              boxShadow: '0 0 8px rgba(255,220,100,0.9), inset 0 1px 2px rgba(255,255,255,0.8)',
              border: '1px solid rgba(255,215,0,0.6)'
            }} />
            <div style={{
              width: '70px',
              height: '1px',
              marginLeft: '6px',
              background: 'linear-gradient(90deg, rgba(197,160,78,.4), rgba(197,160,78,.9))'
            }} />
            <div style={{
              width: '6px',
              height: '6px',
              borderTop: '1px solid rgba(255,220,120,.9)',
              borderRight: '1px solid rgba(255,220,120,.9)',
              transform: 'rotate(45deg)',
              marginLeft: '-2px'
            }} />
          </div>

          {/* Центр: слово БАЛАНС и цифра */}
          <div style={{ position: 'relative', zIndex: 5, textAlign: 'center' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'rgba(255,255,255,.5)',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '4px',
              filter: 'blur(0.3px)'
            }}>
              БАЛАНС
            </div>
            <div style={{
              fontSize: dynamicFontSize,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-2px',
              background: 'linear-gradient(180deg,#FFD700 0%,#C5A04E 60%,#8B7300 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              WebkitTextStroke: '1px rgba(0,0,0,.25)',
              filter: 'drop-shadow(0 0 8px rgba(197,160,78,.55))',
              marginTop: '4px'
            }}>
              {balanceStr}
            </div>
            <div style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,.65)',
              letterSpacing: '.3px',
              filter: 'blur(0.4px)',
              opacity: 0.7,
              marginTop: '4px'
            }}>
              {karmikWord}
            </div>
          </div>

          {/* Правая точка – отодвинута дальше */}
          <div style={{ position: 'absolute', right: '2px', display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderTop: '1px solid rgba(255,220,120,.9)',
              borderRight: '1px solid rgba(255,220,120,.9)',
              transform: 'rotate(225deg)',
              marginRight: '-2px'
            }} />
            <div style={{
              width: '70px',
              height: '1px',
              marginRight: '6px',
              background: 'linear-gradient(90deg, rgba(197,160,78,.9), rgba(197,160,78,.4))'
            }} />
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #FFE484, #B8860B)',
              boxShadow: '0 0 8px rgba(255,220,100,0.9), inset 0 1px 2px rgba(255,255,255,0.8)',
              border: '1px solid rgba(255,215,0,0.6)'
            }} />
          </div>
        </div>

        {/* Кнопки действий */}
        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {['История', 'Покупки', 'Перевести'].map((label) => (
            <button
              key={label}
              onClick={() => {
                if (label === 'История') window.location.href = '/history'
                if (label === 'Покупки') window.location.href = '/my-purchases'
                if (label === 'Перевести') window.location.href = '/transfer'
              }}
              style={{
                flex: '1 1 0',
                fontSize: '13px',
                color: 'rgba(255,255,255,.82)',
                background: 'transparent',
                border: '1px solid rgba(197,160,78,.35)',
                borderRadius: '50px',
                padding: '6px 0',
                cursor: 'pointer',
                transition: 'all 0.25s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(197,160,78,0.15)'
                e.target.style.borderColor = '#C5A04E'
                e.target.style.boxShadow = '0 0 15px rgba(197,160,78,0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.borderColor = 'rgba(197,160,78,.35)'
                e.target.style.boxShadow = 'none'
              }}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => window.location.href = '/shop'}
            style={{
              flexBasis: '100%',
              border: '1px solid rgba(197,160,78,.35)',
              borderRadius: '50px',
              background: 'transparent',
              color: 'rgba(255,255,255,.82)',
              padding: '6px 0',
              cursor: 'pointer',
              transition: 'all 0.25s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(197,160,78,0.15)'
              e.target.style.borderColor = '#C5A04E'
              e.target.style.boxShadow = '0 0 15px rgba(197,160,78,0.4)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent'
              e.target.style.borderColor = 'rgba(197,160,78,.35)'
              e.target.style.boxShadow = 'none'
            }}
          >
            Магазин
          </button>
        </div>
      </div>

      {/* Разделы‑украшения */}
      <div className="grid grid-cols-2 gap-5 w-full max-w-2xl">
        <div className="premium-card-enhanced">
          <h3 className="text-lg font-semibold mb-2">Задания</h3>
          <p className="text-gray-500 text-sm">Активные задачи скоро появятся</p>
        </div>
        <div className="premium-card-enhanced">
          <h3 className="text-lg font-semibold mb-2">Рейтинг</h3>
          <p className="text-gray-500 text-sm">Топ сотрудников</p>
        </div>
        <div className="premium-card-enhanced">
          <h3 className="text-lg font-semibold mb-2">Соревнования</h3>
          <p className="text-gray-500 text-sm">Внутренние чемпионаты</p>
        </div>
        <div className="premium-card-enhanced">
          <h3 className="text-lg font-semibold mb-2">Битва экспертов</h3>
          <p className="text-gray-500 text-sm">Всеобщая игра</p>
        </div>
      </div>
    </div>
  )
}
