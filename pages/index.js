import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      setUser(user)
      await fetchBalance(user.id)
      await fetchTransactions(user.id)
    }
    setLoading(false)
  }

  async function fetchBalance(userId) {
    const { data } = await supabase
      .from('karma_balance')
      .select('balance')
      .eq('user_id', userId)
      .single()
    if (data) setBalance(data.balance)
  }

  async function fetchTransactions(userId) {
    const { data } = await supabase
      .from('karma_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    setTransactions(data || [])
  }

  if (loading) return <div className="p-8 text-center">Загрузка...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="premium-card mb-8">
        <h1 className="text-2xl font-bold text-deep-blue">Добро пожаловать, {user.email}</h1>
        <p className="text-gray-600 mt-2">Ваш текущий баланс кармы:</p>
        <div className="text-4xl font-bold text-gold mt-4">{balance} <span className="text-lg">кармиков</span></div>
      </div>

      <div className="premium-card">
        <h2 className="text-xl font-semibold text-deep-blue mb-4">Последние операции</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500">Пока нет операций</p>
        ) : (
          <ul className="space-y-3">
            {transactions.map(tx => (
              <li key={tx.id} className="flex justify-between border-b border-gray-100 pb-2">
                <div>
                  <p className="font-medium">{tx.description}</p>
                  <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleString('ru')}</p>
                </div>
                <span className={tx.amount >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
