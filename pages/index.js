import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
      else {
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
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Карточка баланса */}
      <div className="balance-card mb-6">
        <div className="balance-label">Баланс кармиков</div>
        <div className="balance-amount mt-1">{balance.toLocaleString()}</div>
        <div className="text-gray-400 text-sm mt-2">{user.email}</div>
      </div>

      {/* Навигационные плитки */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/transfer" className="card hover:border-[#C5A04E] transition">
          <h3 className="font-medium text-gray-900">Перевод</h3>
          <p className="text-xs text-gray-500 mt-1">Отправить кармики</p>
        </Link>
        <Link href="/history" className="card hover:border-[#C5A04E] transition">
          <h3 className="font-medium text-gray-900">История</h3>
          <p className="text-xs text-gray-500 mt-1">Операции и покупки</p>
        </Link>
        <Link href="/shop" className="card hover:border-[#C5A04E] transition">
          <h3 className="font-medium text-gray-900">Магазин</h3>
          <p className="text-xs text-gray-500 mt-1">Награды за кармики</p>
        </Link>
        <Link href="/tasks" className="card hover:border-[#C5A04E] transition">
          <h3 className="font-medium text-gray-900">Задания</h3>
          <p className="text-xs text-gray-500 mt-1">Заработать баллы</p>
        </Link>
      </div>

      {/* Второстепенные ссылки */}
      <div className="mt-6 flex flex-wrap gap-2 justify-center text-xs text-gray-400">
        <Link href="/events" className="hover:text-gray-600">События</Link>
        <Link href="/leaderboard" className="hover:text-gray-600">Рейтинг</Link>
        <Link href="/my-purchases" className="hover:text-gray-600">Мои покупки</Link>
        <Link href="/confirm" className="hover:text-gray-600">Подтверждения</Link>
      </div>
    </div>
  )
}
