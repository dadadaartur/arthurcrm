import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import BackArrow from '../components/BackArrow'

export default function History() {
  const [user, setUser] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [transfers, setTransfers] = useState([])
  const [purchases, setPurchases] = useState([])
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)
  const ITEMS_PER_PAGE = 10

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

    // Кто отправил/кому ушёл перевод (п.14 ТЗ) — отдельными запросами, а не
    // through PostgREST-эмбеддинг по FK, чтобы не зависеть от точного имени
    // связи в схеме (не проверял его напрямую, а после пары эпизодов с
    // непроверенными предположениями о схеме в этой сессии лишний раз не
    // рискую — простой список ID безопаснее).
    const counterpartIds = [...new Set((tr || []).map(t => t.from_user_id === userId ? t.to_user_id : t.from_user_id).filter(Boolean))]
    let profilesById = {}
    if (counterpartIds.length) {
      const { data: profs } = await supabase.from('profiles')
        .select('user_id, first_name, last_name, display_name, email, department_id')
        .in('user_id', counterpartIds)
      const deptIds = [...new Set((profs || []).map(p => p.department_id).filter(Boolean))]
      let deptsById = {}
      if (deptIds.length) {
        const { data: deps } = await supabase.from('departments').select('id, name').in('id', deptIds)
        deptsById = Object.fromEntries((deps || []).map(d => [d.id, d.name]))
      }
      profilesById = Object.fromEntries((profs || []).map(p => [p.user_id, {
        name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || p.email,
        email: p.email, department: p.department_id ? deptsById[p.department_id] : null
      }]))
    }
    const trWithCounterpart = (tr || []).map(t => ({ ...t, counterpart: profilesById[t.from_user_id === userId ? t.to_user_id : t.from_user_id] || null }))

    setTransactions(tx || [])
    setTransfers(trWithCounterpart)
    setPurchases(pr || [])
  }

  const allOperations = [
    ...transactions.map(t => ({ ...t, type: 'transaction' })),
    ...transfers.map(t => ({ ...t, type: 'transfer' })),
    ...purchases.map(p => ({ ...p, type: 'purchase' }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const filtered = allOperations.filter(op => {
    if (filter === 'income') return (op.type === 'transaction' && op.amount > 0) || (op.type === 'transfer' && op.to_user_id === user.id)
    if (filter === 'expense') return (op.type === 'transaction' && op.amount < 0) || (op.type === 'transfer' && op.from_user_id === user.id) || op.type === 'purchase'
    if (filter === 'transfer') return op.type === 'transfer'
    return true
  })

  const paginated = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="premium-card mb-6">
        <BackArrow href="/" title="История операций" />
        <div className="flex gap-2 flex-wrap">
          {['all', 'income', 'expense', 'transfer'].map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(0) }} className={`filter-pill ${filter === f ? 'active' : ''}`}>
              {f === 'all' ? 'Все' : f === 'income' ? 'Начисления' : f === 'expense' ? 'Списания' : 'Переводы'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {paginated.map(op => (
          <div key={op.id + op.type} className="premium-card flex justify-between items-center">
            <div>
              <p className="font-medium text-white">
                {op.type === 'transfer' ? (
                  op.from_user_id === user.id ? 'Исходящий перевод' : 'Входящий перевод'
                ) : op.type === 'purchase' ? (
                  `Покупка: ${op.reward_name}`
                ) : (
                  op.description
                )}
              </p>
              {op.type === 'transfer' && op.counterpart && (
                <p className="text-sm mt-1" style={{ color: '#a0e9ff' }}>
                  {op.from_user_id === user.id ? 'Кому: ' : 'От: '}{op.counterpart.name}
                  <span className="text-gray-500"> · {op.counterpart.email}{op.counterpart.department ? ` · ${op.counterpart.department}` : ''}</span>
                </p>
              )}
              <p className="text-sm text-gray-400">{new Date(op.created_at).toLocaleString('ru')}</p>
            </div>
            <span className={`font-semibold ${(op.type === 'transaction' && op.amount >= 0) || (op.type === 'transfer' && op.to_user_id === user.id) ? 'text-green-400' : 'text-red-400'}`}>
              {op.type === 'transaction' ? (op.amount > 0 ? '+' : '') + op.amount :
               op.type === 'transfer' ? (op.from_user_id === user.id ? '-' : '+') + op.amount :
               op.type === 'purchase' ? '-' + op.cost : ''}
            </span>
          </div>
        ))}
      </div>

      {filtered.length > ITEMS_PER_PAGE && (
        <div className="flex justify-between mt-6">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-outline text-sm">Назад</button>
          <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * ITEMS_PER_PAGE >= filtered.length} className="btn-outline text-sm">Вперед</button>
        </div>
      )}
    </div>
  )
}
