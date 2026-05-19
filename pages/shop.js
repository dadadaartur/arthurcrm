import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Shop() {
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [rewards, setRewards] = useState([])
  const [modal, setModal] = useState({ show: false, message: '', type: '' })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)
      supabase.from('karma_balance').select('balance').eq('user_id', user.id).single().then(({ data }) => {
        if (data) setBalance(data.balance)
      })
      supabase.from('rewards').select('*').then(({ data }) => setRewards(data || []))
    })
  }, [])

  async function purchase(reward) {
    if (balance < reward.cost) {
      setModal({ show: true, message: 'Недостаточно кармиков', type: 'error' })
      return
    }
    const { error } = await supabase.from('purchases').insert({
      user_id: user.id,
      reward_id: reward.id,
      reward_name: reward.name,
      cost: reward.cost,
      status: 'new'
    })
    if (!error) {
      await supabase.from('karma_events').insert({
        user_id: user.id,
        description: `Покупка: ${reward.name}`,
        amount: -reward.cost,
        status: 'auto_approved',
        category: 'purchase'
      })
      setBalance(balance - reward.cost)
      setModal({ show: true, message: `Вы приобрели "${reward.name}"`, type: 'success' })
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="premium-card mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Магазин наград</h1>
        <div className="text-sm text-gray-500 mt-2">Баланс: <span className="text-gold font-semibold">{balance}</span> кармиков</div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.map(reward => (
          <div key={reward.id} className="premium-card flex flex-col">
            <h3 className="font-semibold text-lg text-gray-800">{reward.name}</h3>
            <p className="text-gray-600 text-sm mt-2">{reward.description}</p>
            <div className="mt-auto flex justify-between items-center pt-4">
              <span className="text-gold font-bold">{reward.cost} к.</span>
              <button onClick={() => purchase(reward)} className="btn-gold text-sm">Купить</button>
            </div>
          </div>
        ))}
      </div>

      {modal.show && (
        <div className="modal-overlay" onClick={() => setModal({ ...modal, show: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>{modal.type === 'success' ? '✨' : '⚠️'}</div>
            <p className="text-gray-800">{modal.message}</p>
            <button onClick={() => setModal({ ...modal, show: false })} className="btn-gold mt-6">Ок</button>
          </div>
        </div>
      )}
    </div>
  )
}
