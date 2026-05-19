import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

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

  if (loading) return <div className="p-8 text-center text-gray-400">Загрузка...</div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 flex justify-end">
      <div className="balance-block">
        <div className="balance-number">{balance.toLocaleString()}</div>
        <div className="mt-5 flex items-center">
          <button onClick={() => router.push('/history')} className="ghost-button">
            История операций
          </button>
          <button onClick={() => router.push('/transfer')} className="ghost-button">
            Перевести
          </button>
          <button onClick={() => router.push('/my-purchases')} className="ghost-button">
            Мои покупки
          </button>
        </div>
      </div>
    </div>
  )
}
