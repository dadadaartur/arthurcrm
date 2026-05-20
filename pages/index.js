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
      {/* Основная сетка: слева баланс + кнопки, справа разделы */}
      <div className="flex flex-col lg:flex-row gap-8 w-full">
        {/* Левая колонка: баланс и кнопки */}
        <div className="flex flex-col items-start">
          {/* Блок баланса (только нимб и цифры) */}
          <div style={{
            background: '#0A0A0A',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '28px',
            padding: '36px 40px',
            boxShadow: `
              0 0 0 2px rgba(197,160,78,.3),
              0 0 60px rgba(197,160,78,.3),
              0 0 100px rgba(197,160,78,.15),
              inset 0 2px 8px rgba(255,255,255,.08),
              inset 0 0 40px rgba(255,220,140,.04),
              inset 0 -4px 12px rgba(0,0,0,.35)
            `,
            width: '560px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Верхний блик */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '80px',
              background: 'linear-gradient(180deg, rgba(255,255,255,.06), transparent)',
              pointerEvents: 'none'
            }} />

            {/* Нимб + цифра + слово БАЛАНС внутри */}
            <div style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '260px'
            }}>
              {/* Размытый золотой нимб (три слоя) */}
              <div style={{
                position: 'absolute',
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(197,160,78,.4) 0%, transparent 70%)',
                filter: 'blur(20px)',
                animation: 'haloGlow 3s infinite ease-in-out',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }} />
              <div style={{
                position: 'absolute',
                width: '240px',
                height: '240px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,215,0,.5) 0%, transparent 60%)',
                filter: 'blur(15px)',
                animation: 'haloGlow 2.5s infinite ease-in-out',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }} />
              <div style={{
                position: 'absolute',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,.8) 0%, transparent 50%)',
                filter: 'blur(10px)',
                animation: 'haloGlow 2s infinite ease-in-out',
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

              {/* Центр: цифра и надписи */}
              <div style={{ position: 'relative', zIndex: 5, textAlign: 'center' }}>
                <div style={{
                  fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,.6)',
                  textTransform: 'uppercase', letterSpacing: '3px',
                  marginBottom: '6px', filter: 'blur(0.3px)'
                }}>
                  БАЛАНС
                </div>
                <div style={{
                  fontSize: dynamicFontSize, fontWeight: 700, lineHeight: 1,
                  letterSpacing: '-2px',
                  background: 'linear-gradient(180deg,#FFD700 0%,#C5A04E 60%,#8B7300 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  WebkitTextStroke: '1px rgba(0,0,0,.25)',
                  filter: 'drop-shadow(0 0 12px rgba(197,160,78,.8))',
                  marginTop: '6px'
                }}>
                  {balanceStr}
                </div>
                <div style={{
                  fontSize: '14px', color: 'rgba(255,255,255,.7)',
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

          {/* Кнопки (строго отделены, стиль не тронут) */}
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
                  color: 'rgba(255,255,255,.82)',
                  background: 'transparent',
                  border: '1px solid rgba(197,160,78,.35)',
                  borderRadius: '50px',
                  padding: '12px 0',
                  cursor: 'pointer',
                  transition: 'all 0.25s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(197,160,78,0.2)'
                  e.target.style.borderColor = '#C5A04E'
                  e.target.style.boxShadow = '0 0 20px rgba(197,160,78,0.5)'
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
                fontSize: '14px',
                color: 'rgba(255,255,255,.82)',
                background: 'transparent',
                border: '1px solid rgba(197,160,78,.35)',
                borderRadius: '50px',
                padding: '12px 0',
                cursor: 'pointer',
                transition: 'all 0.25s',
                marginTop: '4px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(197,160,78,0.2)'
                e.target.style.borderColor = '#C5A04E'
                e.target.style.boxShadow = '0 0 20px rgba(197,160,78,0.5)'
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

        {/* Правая колонка: разделы-украшения (заполняют пространство) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
          <div className="premium-card-enhanced">
            <h3 className="text-xl font-semibold mb-2">Задания</h3>
            <p className="text-gray-600 text-sm">Выполняй миссии и расти над собой</p>
          </div>
          <div className="premium-card-enhanced">
            <h3 className="text-xl font-semibold mb-2">Рейтинг</h3>
            <p className="text-gray-600 text-sm">Твоя позиция среди лучших</p>
          </div>
          <div className="premium-card-enhanced">
            <h3 className="text-xl font-semibold mb-2">Соревнования</h3>
            <p className="text-gray-600 text-sm">Докажи своё мастерство в битве</p>
          </div>
          <div className="premium-card-enhanced">
            <h3 className="text-xl font-semibold mb-2">Битва экспертов</h3>
            <p className="text-gray-600 text-sm">Всероссийский чемпионат профессионалов</p>
          </div>
        </div>
      </div>
    </div>
  )
}
