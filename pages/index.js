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
          {/* Блок баланса (белый рельефный) */}
          <div style={{
            background: `linear-gradient(180deg, #FFFFFF 0%, #FDFDFD 100%)`,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
            border: '1px solid rgba(0,0,0,0.04)',
            borderRadius: '32px',
            padding: '36px 40px',
            boxShadow: `
              0 0 0 2px rgba(76,175,80,.25),
              0 20px 40px -12px rgba(0,0,0,0.08),
              0 0 80px rgba(76,175,80,0.1)
            `,
            width: '560px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Центральная область с нимбом (строгий, тонкий) */}
            <div style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '260px'
            }}>
              {/* Тонкое кольцо + зелёное свечение */}
              <div style={{
                position: 'absolute',
                width: '220px',
                height: '220px',
                borderRadius: '50%',
                border: '1px solid rgba(76,175,80,.7)',
                boxShadow: '0 0 25px rgba(76,175,80,0.5), 0 0 50px rgba(76,175,80,0.2)',
                animation: 'ringPulse 3s infinite ease-in-out',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'transparent'
              }} />

              {/* Левая стрелка (укорочена и отодвинута, зелёная гамма) */}
              <div style={{ position: 'absolute', left: '8px', display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, #A5D6A7, #2E7D32)',
                  boxShadow: '0 0 16px rgba(76,175,80,1), inset 0 1px 2px rgba(255,255,255,0.9)',
                  border: '1px solid rgba(76,175,80,0.8)'
                }} />
                <div style={{
                  width: '80px', height: '1px', marginLeft: '8px',
                  background: 'linear-gradient(90deg, rgba(76,175,80,.5), rgba(76,175,80,1))'
                }} />
                <div style={{
                  width: '6px', height: '6px',
                  borderTop: '1px solid rgba(76,175,80,1)', borderRight: '1px solid rgba(76,175,80,1)',
                  transform: 'rotate(45deg)', marginLeft: '-2px'
                }} />
              </div>

              {/* Центр: цифра и надписи (зелёный градиент) */}
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
                  background: 'linear-gradient(180deg,#2E7D32 0%,#4CAF50 60%,#81C784 100%)',
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

              {/* Правая стрелка (зелёная гамма) */}
              <div style={{ position: 'absolute', right: '8px', display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '6px', height: '6px',
                  borderTop: '1px solid rgba(76,175,80,1)', borderRight: '1px solid rgba(76,175,80,1)',
                  transform: 'rotate(225deg)', marginRight: '-2px'
                }} />
                <div style={{
                  width: '80px', height: '1px', marginRight: '8px',
                  background: 'linear-gradient(90deg, rgba(76,175,80,1), rgba(76,175,80,.5))'
                }} />
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, #A5D6A7, #2E7D32)',
                  boxShadow: '0 0 16px rgba(76,175,80,1), inset 0 1px 2px rgba(255,255,255,0.9)',
                  border: '1px solid rgba(76,175,80,0.8)'
                }} />
              </div>
            </div>
          </div>

          {/* Кнопки действий (голограммные, позитивные цвета) */}
          <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', width: '560px' }}>
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

        {/* Правая колонка: разделы-украшения (голограммные карточки) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
          <div className="card-hologram">
            <h3 className="text-xl font-semibold mb-2">Задания</h3>
            <p className="text-gray-600 text-sm">Выполняй миссии и расти над собой</p>
          </div>
          <div className="card-hologram">
            <h3 className="text-xl font-semibold mb-2">Рейтинг</h3>
            <p className="text-gray-600 text-sm">Твоя позиция среди лучших</p>
          </div>
          <div className="card-hologram">
            <h3 className="text-xl font-semibold mb-2">Соревнования</h3>
            <p className="text-gray-600 text-sm">Докажи своё мастерство в битве</p>
          </div>
          <div className="card-hologram">
            <h3 className="text-xl font-semibold mb-2">Битва экспертов</h3>
            <p className="text-gray-600 text-sm">Всероссийский чемпионат профессионалов</p>
          </div>
        </div>
      </div>
    </div>
  )
}
