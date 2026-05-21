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

// SVG-иконки с градиентами (как в оригинале)
const icons = {
  transfer: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="gradTransfer" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c084fc"/>
          <stop offset="100%" stopColor="#38bdf8"/>
        </linearGradient>
      </defs>
      <path d="M7 16 L17 8 M17 8 L13 8 M17 8 L17 12" stroke="url(#gradTransfer)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 16 L7 8 M7 8 L11 8 M7 8 L7 12" stroke="url(#gradTransfer)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  shop: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="gradShop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f97316"/>
          <stop offset="100%" stopColor="#fbbf24"/>
        </linearGradient>
      </defs>
      <path d="M6 7 L18 7 L17 20 L7 20 Z" stroke="url(#gradShop)" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M9 7 L9 5 C9 3.5 10.5 2 12 2 C13.5 2 15 3.5 15 5 L15 7" stroke="url(#gradShop)" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="10" cy="12" r="0.8" fill="url(#gradShop)"/>
      <circle cx="14" cy="12" r="0.8" fill="url(#gradShop)"/>
    </svg>
  ),
  history: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="gradHistory" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981"/>
          <stop offset="100%" stopColor="#34d399"/>
        </linearGradient>
      </defs>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="url(#gradHistory)" strokeWidth="1.8"/>
      <path d="M8 10 L16 10 M8 14 L14 14" stroke="url(#gradHistory)" strokeWidth="1.8" strokeLinecap="round"/>
      <polyline points="16 8 10 13 7 11" stroke="url(#gradHistory)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  purchases: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M5 7h14l-1 13H6L5 7z" stroke="#f97316" strokeWidth="1.8"/>
      <path d="M9 7V5a2 2 0 0 1 4 0v2" stroke="#f97316" strokeWidth="1.8"/>
    </svg>
  )
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8">
        {/* Левая колонка: баланс и кнопки */}
        <div className="flex flex-col gap-5">
          <div className="balance-card">
            <div className="text-lg font-bold gradient-text mb-1">БАЛАНС</div>
            <div className="text-5xl font-extrabold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent drop-shadow-md mb-1">
              {balance.toLocaleString()}
            </div>
            <div className="text-lg font-bold gradient-text mb-6">{karmikWord}</div>

            <div className="flex gap-4 justify-center flex-wrap mb-5">
              <button onClick={() => window.location.href = '/transfer'} className="action-btn">
                <span className="flex items-center justify-center w-8 h-8">{icons.transfer}</span>
                <span>Перевести</span>
              </button>
              <button onClick={() => window.location.href = '/shop'} className="action-btn">
                <span className="flex items-center justify-center w-8 h-8">{icons.shop}</span>
                <span>Магазин</span>
              </button>
              <button onClick={() => window.location.href = '/history'} className="action-btn">
                <span className="flex items-center justify-center w-8 h-8">{icons.history}</span>
                <span>Операции</span>
              </button>
            </div>
            <button onClick={() => window.location.href = '/my-purchases'} className="wide-btn">
              {icons.purchases}
              Мои покупки
            </button>
          </div>
        </div>

        {/* Правая колонка: разделы-украшения */}
        <div className="flex flex-col gap-5">
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
