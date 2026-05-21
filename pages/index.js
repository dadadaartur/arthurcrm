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
                          balanceStr.length > 4 ? '46px' :
                          balanceStr.length > 3 ? '54px' : '62px'

  return (
    <div className="flex flex-col items-start px-12 py-8">
      <div className="flex flex-col lg:flex-row gap-8 w-full">
        {/* Левая колонка: баланс и кнопки */}
        <div className="flex flex-col items-start">
          {/* Блок баланса — чёрный фон, золотые детали */}
          <div style={{
            background: '#0A0A0A',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '28px',
            padding: '24px 32px',
            boxShadow: `
              0 0 0 2px rgba(197,160,78,.3),
              0 0 40px rgba(197,160,78,.2),
              0 0 80px rgba(197,160,78,.1),
              inset 0 2px 8px rgba(255,255,255,.08),
              inset 0 0 40px rgba(255,220,140,.04),
              inset 0 -4px 12px rgba(0,0,0,.35)
            `,
            width: '460px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Верхний золотой блик */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '70px',
              background: 'linear-gradient(180deg, rgba(197,160,78,.2), transparent)',
              pointerEvents: 'none'
            }} />

            {/* Центральная область с нимбом */}
            <div style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px'
            }}>
              {/* Тонкое золотое кольцо */}
              <div style={{
                position: 'absolute',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                border: '1px solid rgba(197,160,78,.7)',
                boxShadow: '0 0 12px rgba(197,160,78,0.3)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'transparent'
              }} />

              {/* Левая стрелка (золотая) */}
              <div style={{ position: 'absolute', left: '10px', display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, #FFD700, #B8860B)',
                  boxShadow: '0 0 10px rgba(197,160,78,0.9)',
                  border: '1px solid rgba(197,160,78,0.8)'
                }} />
                <div style={{
                  width: '60px', height: '1px', marginLeft: '6px',
                  background: 'linear-gradient(90deg, rgba(197,160,78,.6), rgba(197,160,78,1))'
                }} />
                <div style={{
                  width: '5px', height: '5px',
                  borderTop: '1px solid rgba(197,160,78,1)', borderRight: '1px solid rgba(197,160,78,1)',
                  transform: 'rotate(45deg)', marginLeft: '-2px'
                }} />
              </div>

              {/* Центр: цифра и надписи (золото на чёрном) */}
              <div style={{ position: 'relative', zIndex: 5, textAlign: 'center' }}>
                <div style={{
                  fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase', letterSpacing: '2px',
                  marginBottom: '4px', filter: 'blur(0.3px)'
                }}>
                  БАЛАНС
                </div>
                <div style={{
                  fontSize: dynamicFontSize, fontWeight: 700, lineHeight: 1,
                  letterSpacing: '-2px',
                  background: 'linear-gradient(180deg,#FFD700 0%,#C5A04E 60%,#8B7300 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  WebkitTextStroke: '1px rgba(0,0,0,.25)',
                  filter: 'drop-shadow(0 0 10px rgba(197,160,78,.6))',
                  marginTop: '4px'
                }}>
                  {balanceStr}
                </div>
                <div style={{
                  fontSize: '13px', color: 'rgba(255,255,255,0.6)',
                  letterSpacing: '.3px', opacity: 0.8, marginTop: '4px'
                }}>
                  {karmikWord}
                </div>
              </div>

              {/* Правая стрелка (золотая) */}
              <div style={{ position: 'absolute', right: '10px', display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '5px', height: '5px',
                  borderTop: '1px solid rgba(197,160,78,1)', borderRight: '1px solid rgba(197,160,78,1)',
                  transform: 'rotate(225deg)', marginRight: '-2px'
                }} />
                <div style={{
                  width: '60px', height: '1px', marginRight: '6px',
                  background: 'linear-gradient(90deg, rgba(197,160,78,1), rgba(197,160,78,.6))'
                }} />
                <div style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, #FFD700, #B8860B)',
                  boxShadow: '0 0 10px rgba(197,160,78,0.9)',
                  border: '1px solid rgba(197,160,78,0.8)'
                }} />
              </div>
            </div>
          </div>

          {/* Кнопки действий (голограммные, без изменений) */}
          <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', width: '460px' }}>
            {['История', 'Покупки', 'Перевести'].map((label) => (
              <button
                key={label}
                onClick={() => {
                  if (label === 'История') window.location.href = '/history'
                  if (label === 'Покупки') window.location.href = '/my-purchases'
                  if (label === 'Перевести') window.location.href = '/transfer'
                }}
                className="btn-hologram"
                style={{ flex: '1 1 0' }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => window.location.href = '/shop'}
              className="btn-hologram"
              style={{ flexBasis: '100%', marginTop: '4px' }}
            >
              Магазин
            </button>
          </div>
        </div>

        {/* Правая колонка: разделы-украшения (фиолетовые заголовки) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
          <div className="card-hologram">
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#C71AC6' }}>Задания</h3>
            <p className="text-sm" style={{ background: 'linear-gradient(135deg, #2E7D32, #4CAF50)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Выполняй миссии и расти над собой</p>
          </div>
          <div className="card-hologram">
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#C71AC6' }}>Рейтинг</h3>
            <p className="text-sm" style={{ background: 'linear-gradient(135deg, #2E7D32, #4CAF50)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Твоя позиция среди лучших</p>
          </div>
          <div className="card-hologram">
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#C71AC6' }}>Соревнования</h3>
            <p className="text-sm" style={{ background: 'linear-gradient(135deg, #2E7D32, #4CAF50)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Докажи своё мастерство в битве</p>
          </div>
          <div className="card-hologram">
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#C71AC6' }}>Битва экспертов</h3>
            <p className="text-sm" style={{ background: 'linear-gradient(135deg, #2E7D32, #4CAF50)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Всероссийский чемпионат профессионалов</p>
          </div>
        </div>
      </div>
    </div>
  )
}
