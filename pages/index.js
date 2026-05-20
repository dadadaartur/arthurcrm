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
          {/* Блок баланса (без изменений дизайна) */}
          <div style={{
            background: `linear-gradient(180deg, #FFFFFF 0%, #FDFDFD 100%)`,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
            border: '1px solid rgba(0,0,0,0.04)',
            borderRadius: '28px',
            padding: '24px 32px',
            boxShadow: `
              0 0 0 2px rgba(76,175,80,.2),
              0 12px 24px -8px rgba(0,0,0,0.06),
              0 0 40px rgba(76,175,80,0.06)
            `,
            width: '460px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Центральная область с нимбом */}
            <div style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px'
            }}>
              {/* Нимб — только тонкое кольцо, без свечения */}
              <div style={{
                position: 'absolute',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                border: '1px solid rgba(76,175,80,.35)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'transparent'
              }} />

              {/* Левая стрелка */}
              <div style={{ position: 'absolute', left: '10px', display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, #A5D6A7, #2E7D32)',
                  boxShadow: '0 0 8px rgba(76,175,80,0.8)',
                  border: '1px solid rgba(76,175,80,0.6)'
                }} />
                <div style={{
                  width: '60px', height: '1px', marginLeft: '6px',
                  background: 'linear-gradient(90deg, rgba(76,175,80,.4), rgba(76,175,80,.8))'
                }} />
                <div style={{
                  width: '5px', height: '5px',
                  borderTop: '1px solid rgba(76,175,80,.8)', borderRight: '1px solid rgba(76,175,80,.8)',
                  transform: 'rotate(45deg)', marginLeft: '-2px'
                }} />
              </div>

              {/* Центр: цифра и надписи */}
              <div style={{ position: 'relative', zIndex: 5, textAlign: 'center' }}>
                <div style={{
                  fontSize: '12px', fontWeight: 500, color: 'rgba(0,0,0,0.4)',
                  textTransform: 'uppercase', letterSpacing: '2px',
                  marginBottom: '4px'
                }}>
                  БАЛАНС
                </div>
                <div style={{
                  fontSize: dynamicFontSize, fontWeight: 700, lineHeight: 1,
                  letterSpacing: '-2px',
                  background: 'linear-gradient(180deg,#2E7D32 0%,#4CAF50 60%,#81C784 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.15))',
                  marginTop: '4px'
                }}>
                  {balanceStr}
                </div>
                <div style={{
                  fontSize: '13px', color: 'rgba(0,0,0,0.45)',
                  letterSpacing: '.3px', opacity: 0.8, marginTop: '4px'
                }}>
                  {karmikWord}
                </div>
              </div>

              {/* Правая стрелка */}
              <div style={{ position: 'absolute', right: '10px', display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '5px', height: '5px',
                  borderTop: '1px solid rgba(76,175,80,.8)', borderRight: '1px solid rgba(76,175,80,.8)',
                  transform: 'rotate(225deg)', marginRight: '-2px'
                }} />
                <div style={{
                  width: '60px', height: '1px', marginRight: '6px',
                  background: 'linear-gradient(90deg, rgba(76,175,80,.8), rgba(76,175,80,.4))'
                }} />
                <div style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, #A5D6A7, #2E7D32)',
                  boxShadow: '0 0 8px rgba(76,175,80,0.8)',
                  border: '1px solid rgba(76,175,80,0.6)'
                }} />
              </div>
            </div>
          </div>

          {/* Кнопки действий (голограммные, с зелёным градиентным текстом) */}
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

        {/* Правая колонка: разделы-украшения (жёлтые заголовки, зелёный текст подписей) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
          <div className="card-hologram">
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#F9A825' }}>Задания</h3>
            <p className="text-sm" style={{ background: 'linear-gradient(135deg, #2E7D32, #4CAF50)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Выполняй миссии и расти над собой</p>
          </div>
          <div className="card-hologram">
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#F9A825' }}>Рейтинг</h3>
            <p className="text-sm" style={{ background: 'linear-gradient(135deg, #2E7D32, #4CAF50)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Твоя позиция среди лучших</p>
          </div>
          <div className="card-hologram">
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#F9A825' }}>Соревнования</h3>
            <p className="text-sm" style={{ background: 'linear-gradient(135deg, #2E7D32, #4CAF50)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Докажи своё мастерство в битве</p>
          </div>
          <div className="card-hologram">
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#F9A825' }}>Битва экспертов</h3>
            <p className="text-sm" style={{ background: 'linear-gradient(135deg, #2E7D32, #4CAF50)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Всероссийский чемпионат профессионалов</p>
          </div>
        </div>
      </div>
    </div>
  )
}
