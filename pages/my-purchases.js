import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function MyPurchases() {
  const [user, setUser] = useState(null)
  const [purchases, setPurchases] = useState([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)
      loadPurchases(user.id)
    })
  }, [])

  async function loadPurchases(userId) {
    const { data } = await supabase.from('purchases')
      .select('*').eq('user_id', userId)
      .order('created_at', { ascending: false })
    setPurchases(data || [])
  }

  async function activate(purchaseId) {
    await supabase.from('purchases').update({ status: 'pending' }).eq('id', purchaseId)
    loadPurchases(user.id)
  }

  const statusLabels = {
    new: 'Новая',
    pending: 'Ожидает подтверждения',
    approved: 'Активирована',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="premium-card mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Мои покупки</h1>
        <p className="text-sm text-gray-500 mt-2">Здесь отображаются ваши приобретённые награды и их статус</p>
      </div>
      {purchases.length === 0 ? (
        <p className="text-gray-500 text-center">Покупок пока нет</p>
      ) : (
        <div className="space-y-4">
          {purchases.map(p => (
            <div key={p.id} className="premium-card flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-800">{p.reward_name}</h3>
                <p className="text-sm text-gray-500">{new Date(p.created_at).toLocaleString('ru')}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  p.status === 'new' ? 'bg-blue-100 text-blue-700' :
                  p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>{statusLabels[p.status] || p.status}</span>
              </div>
              <div className="text-right">
                <p className="text-gold font-semibold">-{p.cost}</p>
                {p.status === 'new' && (
                  <button onClick={() => activate(p.id)} className="btn-outline mt-2 text-xs">Активировать</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
