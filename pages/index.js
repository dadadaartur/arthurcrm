import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'

// Склонение слова "кармик"
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 flex justify-start">
      <div
        style={{
          background: 'linear-gradient(160deg, #1A1A1A 0%, #0D0D0D 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '28px',
          padding: '36px 44px',
          boxShadow: `
            0 0 0 2px rgba(197,160,78,.25),
            0 0 40px rgba(197,160,78,.2),
            0 0 80px rgba(197,160,78,.1),
            inset 0 2px 4px rgba(255,255,255,.05),
            inset 0 -4px 8px rgba(0,0,0,.5),
            inset 0 0 30px rgba(255,255,255,.02),
            inset 0 0 60px rgba(0,0,0,.3)
          `,
          minWidth: '560px',
          maxWidth: '600px',
          width: '100%',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* заголовок */}
        <div
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'rgba(255,255,255,.55)',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            marginBottom: '2px',
            filter: 'blur(0.3px)',
            opacity: 0.8
          }}
        >
          БАЛАНС
        </div>

        {/* центр */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '190px'
          }}
        >
          {/* нимб (ярче) */}
          <div
            style={{
              position: 'absolute',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: `
                radial-gradient(
                  circle,
                  transparent 58%,
                  rgba(197,160,78,.12) 70%,
                  transparent 75%
                )
              `,
              border: '1px solid rgba(197,160,78,.35)',
              boxShadow: `
                0 0 50px rgba(197,160,78,.15),
                inset 0 0 30px rgba(197,160,78,.05)
              `,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 1
            }}
          />

          {/* левая стрелка */}
          <div
            style={{
              position: 'absolute',
              left: '10px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#E2BC57',
                boxShadow: '0 0 12px rgba(226,188,87,.9)'
              }}
            />
            <div
              style={{
                width: '60px',
                height: '1px',
                marginLeft: '8px',
                background:
                  'linear-gradient(90deg, rgba(197,160,78,.4), rgba(197,160,78,.9))'
              }}
            />
            <div
              style={{
                width: '8px',
                height: '8px',
                borderTop: '1px solid rgba(255,220,120,.9)',
                borderRight: '1px solid rgba(255,220,120,.9)',
                transform: 'rotate(45deg)',
                marginLeft: '-2px'
              }}
            />
          </div>

          {/* цифра */}
          <div
            style={{
              position: 'relative',
              zIndex: 5,
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontSize: '84px',
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: '-3px',
                background:
                  'linear-gradient(180deg,#FFD700 0%,#C5A04E 60%,#8B7300 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                WebkitTextStroke: '1px rgba(0,0,0,.25)',
                filter: 'drop-shadow(0 0 8px rgba(197,160,78,.55))'
              }}
            >
              {balance.toLocaleString()}
            </div>
            <div
              style={{
                marginTop: '8px',
                fontSize: '14px',
                color: 'rgba(255,255,255,.68)',
                letterSpacing: '.4px',
                filter: 'blur(0.4px)',
                opacity: 0.7,
                textShadow: '0 0 5px rgba(255,255,255,0.15)'
              }}
            >
              {karmikWord}
            </div>
          </div>

          {/* правая стрелка */}
          <div
            style={{
              position: 'absolute',
              right: '10px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderTop: '1px solid rgba(255,220,120,.9)',
                borderRight: '1px solid rgba(255,220,120,.9)',
                transform: 'rotate(225deg)',
                marginRight: '-2px'
              }}
            />
            <div
              style={{
                width: '60px',
                height: '1px',
                marginRight: '8px',
                background:
                  'linear-gradient(90deg, rgba(197,160,78,.9), rgba(197,160,78,.4))'
              }}
            />
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#E2BC57',
                boxShadow: '0 0 12px rgba(226,188,87,.9)'
              }}
            />
          </div>
        </div>

        {/* кнопки */}
        <div
          style={{
            marginTop: '10px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
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
                fontSize: '14px',
                color: 'rgba(255,255,255,.82)',
                background: 'transparent',
                border: '1px solid rgba(197,160,78,.35)',
                borderRadius: '50px',
                padding: '10px 0',
                cursor: 'pointer'
              }}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => { window.location.href = '/shop' }}
            style={{
              flexBasis: '100%',
              border: '1px solid rgba(197,160,78,.35)',
              borderRadius: '50px',
              background: 'transparent',
              color: 'rgba(255,255,255,.82)',
              padding: '10px 0',
              cursor: 'pointer'
            }}
          >
            Магазин
          </button>
        </div>
      </div>
    </div>
  )
}
