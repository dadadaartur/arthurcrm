import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Link from 'next/link'

// Простые SVG-иконки для кнопок (без эмодзи)
const icons = {
  transfer: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 1l4 4-4 4" />
      <path d="M21 5H9" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M3 19h12" />
    </svg>
  ),
  history: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  shop: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  tasks: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
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
        await fetchBalance(user.id)
        // ежедневный бонус можно оставить, но не отвлекаем
      }
      setLoading(false)
    }
    checkUser()
  }, [])

  async function fetchBalance(userId) {
    const { data } = await supabase
      .from('karma_balance')
      .select('balance')
      .eq('user_id', userId)
      .single()
    if (data) setBalance(data.balance)
  }

  if (loading) return <div className="p-8 text-center text-white">Загрузка...</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Карточка баланса */}
      <div className="balance-card mb-8">
        <div className="balance-label">Баланс кармиков</div>
        <div className="balance-amount mt-1">{balance.toLocaleString()}</div>
        <div className="text-white/60 text-sm mt-2">Личный счёт • {user.email}</div>
      </div>

      {/* Сетка действий */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/transfer" className="premium-card flex items-center gap-3 text-deep-blue hover:bg-gray-50 transition">
          <span className="text-gold">{icons.transfer}</span>
          <span className="font-medium">Перевод</span>
        </Link>
        <Link href="/history" className="premium-card flex items-center gap-3 text-deep-blue hover:bg-gray-50 transition">
          <span className="text-gold">{icons.history}</span>
          <span className="font-medium">История</span>
        </Link>
        <Link href="/shop" className="premium-card flex items-center gap-3 text-deep-blue hover:bg-gray-50 transition">
          <span className="text-gold">{icons.shop}</span>
          <span className="font-medium">Магазин</span>
        </Link>
        <Link href="/tasks" className="premium-card flex items-center gap-3 text-deep-blue hover:bg-gray-50 transition">
          <span className="text-gold">{icons.tasks}</span>
          <span className="font-medium">Задания</span>
        </Link>
      </div>

      {/* Дополнительные ссылки (мелким текстом) */}
      <div className="mt-6 flex flex-wrap gap-3 justify-center text-sm text-white/60">
        <Link href="/events" className="hover:text-white transition">События</Link>
        <Link href="/leaderboard" className="hover:text-white transition">Рейтинг</Link>
        <Link href="/my-purchases" className="hover:text-white transition">Мои покупки</Link>
        <Link href="/confirm" className="hover:text-white transition">Подтверждения</Link>
        <Link href="/admin" className="hover:text-white transition">Админ</Link>
      </div>
    </div>
  )
}
