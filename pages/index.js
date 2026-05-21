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

  // Загрузка – показываем спиннер
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner />
      </div>
    )
  }

  const karmikWord = getKarmikWord(balance)

  return (
    <div className="flex flex-col items-start px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8 w-full">
        {/* Левая колонка – блок баланса */}
        <div className="flex flex-col items-start">
          <div className="balance-card">
            {/* Центральная область с нимбом */}
            <div style={{ position: 'relative', height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div className="black-hole" />
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                <div className="text-sm font-bold text-gray-400 mb-2">Баланс</div>
                <div
                  className="text-5xl font-extrabold text-yellow-400 mb-2"
                  style={{
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundImage: 'linear-gradient(180deg, #FFD700, #C5A04E)'
                  }}
                >
                  {balance.toLocaleString()}
                </div>
                <div className="text-lg font-bold text-yellow-500">{karmikWord}</div>
              </div>
            </div>

            {/* Кнопки действий */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => window.location.href = '/transfer'} className="action-btn">Перевести</button>
              <button onClick={() => window.location.href = '/shop'} className="action-btn">Магазин</button>
              <button onClick={() => window.location.href = '/history'} className="action-btn">Операции</button>
              <button onClick={() => window.location.href = '/my-purchases'} className="wide-btn">Мои покупки</button>
            </div>
          </div>
        </div>

        {/* Правая колонка – разделы */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
          <div className="dash-card">
            <h3>Задания</h3>
            <p className="text-sm text-gray-400">Выполняй миссии и расти над собой</p>
          </div>
          <div className="dash-card">
            <h3>Рейтинг</h3>
            <p className="text-sm text-gray-400">Твоя позиция среди лучших</p>
          </div>
          <div className="dash-card">
            <h3>Соревнования</h3>
            <p className="text-sm text-gray-400">Докажи своё мастерство в битве</p>
          </div>
          <div className="dash-card">
            <h3>Битва экспертов</h3>
            <p className="text-sm text-gray-400">Всероссийский чемпионат профессионалов</p>
          </div>
        </div>
      </div>
    </div>
  )
}
