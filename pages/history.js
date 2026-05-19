import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function History() {
  const [user, setUser] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [transfers, setTransfers] = useState([])
  const [purchases, setPurchases] = useState([])
  const [filter, setFilter] = useState('all') // all, income, expense, transfer

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)
      loadData(user.id)
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

  const allOperations = [
    ...transactions.map(t => ({ ...t, type: 'transaction' })),
    ...transfers.map(t => ({ ...t, type: 'transfer' })),
    ...purchases.map(p => ({ ...p, type: 'purchase' }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const filtered = allOperations.filter(op => {
    if (filter === 'income') return (op.type === 'transaction' && op.amount > 0) || (op.type === 'transfer' && op.from_user_id !== user.id)
    if (filter === 'expense') return (op.type === 'transaction' && op.amount < 0) || (op.type === 'transfer' && op.from_user_id === user.id) || op.type === 'purchase'
    if (filter === 'transfer') return op.type === 'transfer'
    return true
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="premium-card mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">История операций</h1>
        <div className="flex gap-2 flex-wrap">
          {['all', 'income', 'expense', 'transfer'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`filter-pill ${filter === f ? 'active' : ''}`}>
              {f === 'all' ? 'Все' : f === 'income' ? 'Начисления' : f === 'expense' ? 'Списания' : 'Переводы'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map(op => (
          <div key={op.id + op.type} className="premium-card flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-800">
                {op.type === 'transfer' ? (
                  op.from_user_id === user.id ? 'Исходящий перевод' : 'Входящий перевод'
                ) : op.type === 'purchase' ? (
                  `Покупка: ${op.reward_name}`
                ) : (
                  op.description
                )}
              </p>
              <p className="text-sm text-gray-500">{new Date(op.created_at).toLocaleString('ru')}</p>
            </div>
            <span className={`font-semibold ${(op.type === 'transaction' && op.amount >= 0) || (op.type === 'transfer' && op.from_user_id !== user.id) ? 'text-green-600' : 'text-red-600'}`}>
              {op.type === 'transaction' ? (op.amount > 0 ? '+' : '') + op.amount :
               op.type === 'transfer' ? (op.from_user_id === user.id ? '-' : '+') + op.amount :
               op.type === 'purchase' ? '-' + op.cost : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
