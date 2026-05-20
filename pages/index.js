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
  const dynamicFontSize = balanceStr.length > 5 ? '42px' :
                          balanceStr.length > 4 ? '52px' :
                          balanceStr.length > 3 ? '62px' : '72px'

  return (
    <div className="flex flex-col items-start px-12 py-8">
      <div className="flex flex-col lg:flex-row gap-8 w-full">
        {/* Левая колонка: баланс и кнопки */}
        <div className="flex flex-col items-start">
          {/* Блок баланса (рельефный белый фон) */}
          <div style={{
            // Стильный рельефный фон: микротекстура и мягкий градиент
            background: `
              linear-gradient(180deg, #FFFFFF 0%, #FDFDFD 100%)
            `,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
            border: '1px solid rgba(0,0,0,0.04)',
            borderRadius: '32px',
            padding: '36px 40px',
            boxShadow: `
              0 0 0 2px rgba(197,160,78,.2),
              0 20px 40px -12px rgba(0,0,0,0.08),
              0 0 80px rgba(197,160,78,0.1)
            `,
            width: '560px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Центральная область с нимбом */}
            <div style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '260px'
            }}>
              {/* Тонкий, но яркий нимб: четкое кольцо + сфокусированное свечение */}
              <div style={{
                position: 'absolute',
                width: '220px',
                height: '220px',
                borderRadius: '50%',
                border: '1px solid rgba(197,160,78,.7)',
                boxShadow: '0 0 25px rgba(197,160,78,0.5), 0 0 50px rgba(197,160,78,0.2)',
                animation: 'ringPulse 3s infinite ease-in-out',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'transparent'
              }} />
              {/* Легкое ядро вокруг цифры (не клякса, а воздух) */}
              <div style={{
                position: 'absolute',
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,215,0,0.2) 40%, transparent 70%)',
                filter: 'blur(4px)',
                animation: 'coreGlow 2s infinite ease-in-out',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }} />

              {/* Левая стрелка */}
              <div style={{ position: 'absolute', left: '4px', display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, #FFE484, #B8860B)',
                  boxShadow: '0 0 16px rgba(255,220,100,1), inset 0 1px 2px rgba(255,255,255,0.9)',
                  border: '1px solid rgba(255,215,0,0.8)'
                }} />
                <div style={{
                  width: '110px', height: '1px', marginLeft: '10px',
                  background: 'linear-gradient(90deg, rgba(197,160,78,.5), rgba(197,160,78,1))'
                }} />
                <div style={{
                  width: '6px', height: '6px',
                  borderTop: '1px solid rgba(255,220,120,1)', borderRight: '1px solid rgba(255,220,120,1)',
                  transform: 'rotate(45deg)', marginLeft: '-2px'
                }} />
              </div>

              {/* Центр: цифра и надписи (золото на белом) */}
              <div style={{ position: 'relative', zIndex: 5, textAlign: 'center' }}>
                <div style={{
                  fontSize: '13px', fontWeight: 500, color: 'rgba(0,0,0,0.4)',
                  textTransform: 'uppercase', letterSpacing: '3px',
                  marginBottom: '6px', filter: 'blur(0.3px)'
                }}>
                  БАЛАНС
                </div>
                <div style={{
                  fontSize: dynamicFontSize, fontWeight: 700, lineHeight: 1,
                  letterSpacing: '-2px',
                  background: 'linear-gradient(180deg,#B8860B 0%,#C5A04E 60%,#FFD700 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.2))',
                  marginTop: '6px'
                }}>
                  {balanceStr}
                </div>
                <div style={{
                  fontSize: '14px', color: 'rgba(0,0,0,0.5)',
                  letterSpacing: '.4px', filter: 'blur(0.5px)',
                  opacity: 0.8, marginTop: '6px'
                }}>
                  {karmikWord}
                </div>
              </div>

              {/* Правая стрелка */}
              <div style={{ position: 'absolute', right: '4px', display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '6px', height: '6px',
                  borderTop: '1px solid rgba(255,220,120,1)', borderRight: '1px solid rgba(255,220,120,1)',
                  transform: 'rotate(225deg)', marginRight: '-2px'
                }} />
                <div style={{
                  width: '110px', height: '1px', marginRight: '10px',
                  background: 'linear-gradient(90deg, rgba(197,160,78,1), rgba(197,160,78,.5))'
                }} />
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, #FFE484, #B8860B)',
                  boxShadow: '0 0 16px rgba(255,220,100,1), inset 0 1px 2px rgba(255,255,255,0.9)',
                  border: '1px solid rgba(255,215,0,0.8)'
                }} />
              </div>
            </div>
          </div>

          {/* Кнопки (стиль не трогаем, только голограммная рамка и эффект наведения) */}
          <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', width: '560px' }}>
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
                  color: '#1A1A1A',
                  background: '#FFFFFF',
                  border: '1px solid transparent',
                  borderRadius: '50px',
                  padding: '12px 0',
                  cursor: 'pointer',
                  transition: 'all 0.25s',
                  // Голограммная рамка
                  boxShadow: '0 0 10px rgba(167,139,250,0.2), 0 0 15px rgba(250,204,21,0.1)',
                  borderImage: 'linear-gradient(135deg, #A78BFA, #FACC15, #60A5FA) 1',
                  backgroundClip: 'padding-box'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#FFFFFF'
                  e.target.style.boxShadow = '0 0 25px rgba(167,139,250,0.5), 0 0 35px rgba(250,204,21,0.3)'
                  e.target.style.filter = 'brightness(1.05)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#FFFFFF'
                  e.target.style.boxShadow = '0 0 10px rgba(167,139,250,0.2), 0 0 15px rgba(250,204,21,0.1)'
                  e.target.style.filter = 'none'
                }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => window.location.href = '/shop'}
              style={{
                flexBasis: '100%',
                fontSize: '14px',
                color: '#1A1A1A',
                background: '#FFFFFF',
                border: '1px solid transparent',
                borderRadius: '50px',
                padding: '12px 0',
                cursor: 'pointer',
                transition: 'all 0.25s',
                marginTop: '4px',
                boxShadow: '0 0 10px rgba(167,139,250,0.2), 0 0 15px rgba(250,204,21,0.1)',
                borderImage: 'linear-gradient(135deg, #A78BFA, #FACC15, #60A5FA) 1',
                backgroundClip: 'padding-box'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#FFFFFF'
                e.target.style.boxShadow = '0 0 25px rgba(167,139,250,0.5), 0 0 35px rgba(250,204,21,0.3)'
                e.target.style.filter = 'brightness(1.05)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#FFFFFF'
                e.target.style.boxShadow = '0 0 10px rgba(167,139,250,0.2), 0 0 15px rgba(250,204,21,0.1)'
                e.target.style.filter = 'none'
              }}
            >
              Магазин
            </button>
          </div>
        </div>

        {/* Правая колонка: разделы-украшения с голограммными рамками */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
          <div className="premium-card-holographic">
            <h3 className="text-xl font-semibold mb-2">Задания</h3>
            <p className="text-gray-600 text-sm">Выполняй миссии и расти над собой</p>
          </div>
          <div className="premium-card-holographic">
            <h3 className="text-xl font-semibold mb-2">Рейтинг</h3>
            <p className="text-gray-600 text-sm">Твоя позиция среди лучших</p>
          </div>
          <div className="premium-card-holographic">
            <h3 className="text-xl font-semibold mb-2">Соревнования</h3>
            <p className="text-gray-600 text-sm">Докажи своё мастерство в битве</p>
          </div>
          <div className="premium-card-holographic">
            <h3 className="text-xl font-semibold mb-2">Битва экспертов</h3>
            <p className="text-gray-600 text-sm">Всероссийский чемпионат профессионалов</p>
          </div>
        </div>
      </div>
    </div>
  )
}
