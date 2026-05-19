import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function Shop() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [rewards, setRewards] = useState([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else {
        setUser(user)
        supabase.from('karma_balance').select('balance').eq('user_id', user.id).single().then(({ data }) => {
          if (data) setBalance(data.balance)
        })
        supabase.from('rewards').select('*').then(({ data }) => setRewards(data || []))
      }
    })
  }, [])

  async function purchase(reward) {
    if (balance < reward.cost) {
      alert('Недостаточно кармиков')
      return
    }
    // Создаём событие с отрицательной суммой (покупка)
    const { error } = await supabase.from('karma_events').insert({
      user_id: user.id,
      description: `Покупка: ${reward.name}`,
      amount: -reward.cost,
      status: 'auto_approved',
      category: 'purchase'
    })
    if (!error) {
      alert('Покупка совершена!')
      setBalance(balance - reward.cost)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="premium-card mb-6">
        <h1 className="text-2xl font-bold text-deep-blue">Магазин наград</h1>
        <p className="text-gold text-xl mt-2">Ваш баланс: {balance} кармиков</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.map(reward => (
          <div key={reward.id} className="premium-card flex flex-col">
            <h3 className="font-semibold text-lg">{reward.name}</h3>
            <p className="text-gray-600 text-sm mb-4">{reward.description}</p>
            <div className="mt-auto flex justify-between items-center">
              <span className="text-gold font-bold">{reward.cost} к.</span>
              <button onClick={() => purchase(reward)} className="btn-gold text-sm">Купить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
