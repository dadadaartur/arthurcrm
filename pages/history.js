import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function History() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [transfers, setTransfers] = useState([])
  const [purchases, setPurchases] = useState([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else {
        setUser(user)
        loadData(user.id)
      }
    })
  }, [])

  async function loadData(userId) {
    const { data: tx } = await supabase.from('karma_transactions')
      .select('*').eq('user_id', userId).order('created_at', { ascending: false })
    const { data: tr } = await supabase.from('transfers')
      .select('*').or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
    const { data: pr } = await supabase.from('purchases')
      .select('*').eq('user_id', userId).order('created_at', { ascending: false })

    setTransactions(tx || [])
    setTransfers(tr || [])
    setPurchases(pr || [])
  }

  // Объединим в общий список с типом операции
  const allOperations = [
    ...transactions.map(t => ({ ...t, type: 'transaction' })),
    ...transfers.map(t => ({ ...t, type: 'transfer' })),
    ...purchases.map(p => ({ ...p, type: 'purchase' }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-6">История операций</h1>
        {allOperations.length === 0 ? (
          <p className="text-gray-500">Операций пока нет</p>
        ) : (
          <ul className="space-y-3">
            {allOperations.map(op => (
              <li key={op.id + op.type} className="flex justify-between items-start border-b border-gray-100 pb-2">
                <div>
                  <p className="font-medium">
                    {op.type === 'transfer' ? (
                      op.from_user_id === user.id
                        ? `Перевод пользователю ${op.to_user_id}`
                        : `Перевод от пользователя ${op.from_user_id}`
                    ) : op.type === 'purchase' ? (
                      `Покупка: ${op.reward_name}`
                    ) : (
                      op.description
                    )}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(op.created_at).toLocaleString('ru')}</p>
                </div>
                <span className={
                  (op.type === 'transaction' && op.amount >= 0) ||
                  (op.type === 'transfer' && op.from_user_id !== user.id) // входящий перевод
                    ? 'text-green-600 font-medium'
                    : 'text-red-600 font-medium'
                }>
                  {op.type === 'transaction' ? (op.amount > 0 ? '+' : '') + op.amount :
                   op.type === 'transfer' ? (op.from_user_id === user.id ? '-' : '+') + op.amount :
                   op.type === 'purchase' ? '-' + op.cost : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
