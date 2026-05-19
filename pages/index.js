import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Spinner from '../components/Spinner'

// Функция склонения слова "кармик"
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
    <div className="p-8 flex justify-center items-center">
      <Spinner />
    </div>
  )

  const karmikWord = getKarmikWord(balance)

  return (
    <div className="max-w-6xl ml-0 mr-auto px-6 py-10 flex justify-start">
      <div className="balance-block">
        <div className="balance-label">Баланс</div>
        <div className="balance-number">{balance.toLocaleString()}</div>
        <div className="balance-word">{karmikWord}</div>

        <div className="balance-actions">
          <button onClick={() => router.push('/history')} className="ghost-framed">
            История
          </button>
          <button onClick={() => router.push('/my-purchases')} className="ghost-framed">
            Покупки
          </button>
          <button onClick={() => router.push('/transfer')} className="ghost-framed">
            Перевести
          </button>
          <button onClick={() => router.push('/shop')} className="ghost-framed ghost-framed-full">
            Магазин
          </button>
        </div>
      </div>
    </div>
  )
}
