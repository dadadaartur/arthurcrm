import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function MyPurchases() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [purchases, setPurchases] = useState([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else {
        setUser(user)
        supabase.from('purchases')
          .select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .then(({ data }) => setPurchases(data || []))
      }
    })
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-6">Мои покупки</h1>
        {purchases.length === 0 ? (
          <p className="text-gray-500">Покупок пока нет</p>
        ) : (
          <ul className="space-y-3">
            {purchases.map(p => (
              <li key={p.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
                <div>
                  <p className="font-medium">{p.reward_name}</p>
                  <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString('ru')}</p>
                </div>
                <span className="text-red-600 font-medium">-{p.cost}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
