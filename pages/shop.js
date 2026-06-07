import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import PremiumModal from '../components/PremiumModal'

export default function Shop() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [rewards, setRewards] = useState([])
  const [modal, setModal] = useState({ show: false, message: '', type: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      supabase.from('karma_balance').select('balance').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setBalance(data.balance) })
      supabase.from('rewards').select('*').then(({ data }) => setRewards(data || []))
    })
  }, [])

  const purchase = async (reward) => {
    setLoading(true)
    const res = await fetch('/api/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId: reward.id })
    })
    const result = await res.json()
    if (res.ok) {
      setBalance(result.newBalance)
      setModal({ show: true, message: `Вы приобрели "${reward.name}"`, type: 'success' })
    } else {
      setModal({ show: true, message: result.error || 'Ошибка', type: 'error' })
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="premium-card mb-8">
        <h1 className="text-2xl font-bold text-white">Магазин наград</h1>
        <div className="text-sm text-gray-300 mt-2">
          Баланс: <span className="text-gold font-semibold">{balance}</span> кармиков
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.map(reward => (
          <div key={reward.id} className="premium-card flex flex-col">
            <h3 className="font-semibold text-lg text-white">{reward.name}</h3>
            <p className="text-gray-300 text-sm mt-2">{reward.description}</p>
            <div className="mt-auto flex justify-between items-center pt-4">
              <span className="text-gold font-bold">{reward.cost} к.</span>
              <button onClick={() => purchase(reward)} disabled={loading} className="btn-gold text-sm">
                Купить
              </button>
            </div>
          </div>
        ))}
      </div>
      <PremiumModal isOpen={modal.show} onClose={() => setModal({ ...modal, show: false })} title={modal.type === 'success' ? 'Успешно' : 'Ошибка'}>
        <p className="text-white">{modal.message}</p>
      </PremiumModal>
    </div>
  )
}
