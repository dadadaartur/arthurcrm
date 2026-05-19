import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
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
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        const { data } = await supabase
          .from('karma_balance')
          .select('balance')
          .eq('user_id', user.id)
          .single()
        if (data) setBalance(data.balance)
      }
      setLoading(false)
    }
    checkUser()
  }, [])

  if (loading) return (
    <div className="flex justify-center items-center py-8">
      <Spinner />
    </div>
  )

  const karmikWord = getKarmikWord(balance)

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 flex justify-start">
      <div style={{
        background: 'linear-gradient(160deg, #1A1A1A 0%, #0D0D0D 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '28px',
        padding: '36px 44px',
        boxShadow: `
          0 0 0 2px rgba(197, 160, 78, 0.25),
          0 0 40px rgba(197, 160, 78, 0.2),
          0 0 80px rgba(197, 160, 78, 0.1),
          inset 0 2px 4px rgba(255, 255, 255, 0.05),
          inset 0 -4px 8px rgba(0, 0, 0, 0.5),
          inset 0 0 30px rgba(255, 255, 255, 0.02),
          inset 0 0 60px rgba(0, 0, 0, 0.3)
        `,
        display: 'inline-block',
        minWidth: '440px',
        maxWidth: '520px',
        width: '100%',
        transition: 'all 0.3s ease'
      }}>
        {/* Заголовок Баланс */}
        <div style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'rgba(255, 255, 255, 0.6)',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          marginBottom: '8px'
        }}>
          Баланс
        </div>

        {/* Цифра баланса */}
        <div style={{
          fontSize: '56px',
          fontWeight: 700,
          letterSpacing: '-1px',
          lineHeight: 1.1,
          textAlign: 'center',
          background: 'linear-gradient(180deg, #FFD700 0%, #C5A04E 50%, #8B7300 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          WebkitTextStroke: '1px rgba(0,0,0,0.3)',
          filter: 'drop-shadow(0 0 4px rgba(197,160,78,0.4))'
        }}>
          {balance.toLocaleString()}
        </div>

        {/* Слово "кармиков" */}
        <div style={{
          textAlign: 'center',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.7)',
          marginTop: '6px',
          fontWeight: 400,
          letterSpacing: '0.3px'
        }}>
          {karmikWord}
        </div>

        {/* Кнопки действий */}
        <div style={{
          marginTop: '28px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {[
            ['История', '/history'],
            ['Покупки', '/my-purchases'],
            ['Перевести', '/transfer'],
          ].map(([label, path]) => (
            <button
              key={path}
              onClick={() => router.push(path)}
              style={{
                flex: '1 1 0',
                fontSize: '14px',
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.8)',
                background: 'transparent',
                border: '1px solid rgba(197, 160, 78, 0.4)',
                borderRadius: '50px',
                padding: '8px 0',
                cursor: 'pointer',
                textShadow: '0 0 8px rgba(197, 160, 78, 0.3)',
                letterSpacing: '0.3px',
                boxShadow: '0 0 12px rgba(197, 160, 78, 0.1)',
                transition: 'all 0.25s',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = 'rgba(197,160,78,0.9)';
                e.target.style.boxShadow = '0 0 24px rgba(197,160,78,0.4)';
                e.target.style.transform = 'scale(1.04)';
                e.target.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = 'rgba(197,160,78,0.4)';
                e.target.style.boxShadow = '0 0 12px rgba(197,160,78,0.1)';
                e.target.style.transform = 'scale(1)';
                e.target.style.color = 'rgba(255,255,255,0.8)';
              }}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => router.push('/shop')}
            style={{
              flexBasis: '100%',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.8)',
              background: 'transparent',
              border: '1px solid rgba(197, 160, 78, 0.4)',
              borderRadius: '50px',
              padding: '8px 0',
              cursor: 'pointer',
              textShadow: '0 0 8px rgba(197, 160, 78, 0.3)',
              letterSpacing: '0.3px',
              boxShadow: '0 0 12px rgba(197, 160, 78, 0.1)',
              transition: 'all 0.25s'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = 'rgba(197,160,78,0.9)';
              e.target.style.boxShadow = '0 0 24px rgba(197,160,78,0.4)';
              e.target.style.transform = 'scale(1.04)';
              e.target.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'rgba(197,160,78,0.4)';
              e.target.style.boxShadow = '0 0 12px rgba(197,160,78,0.1)';
              e.target.style.transform = 'scale(1)';
              e.target.style.color = 'rgba(255,255,255,0.8)';
            }}
          >
            Магазин
          </button>
        </div>
      </div>
    </div>
  )
}
