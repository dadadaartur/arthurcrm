import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

// Премиальные SVG-иконки для типов операций — тонкие линии, стиль банка.
// Никаких эмодзи и стандартных библиотек.
function OpIcon({ type, direction }) {
  const s = { width: 28, height: 28, viewBox: '0 0 28 28', fill: 'none' }
  if (type === 'transfer') {
    const color = direction === 'in' ? '#4ade80' : '#f87171'
    const d = direction === 'in'
      ? 'M6 14h16M16 8l6 6-6 6'   // стрелка вправо (входящий)
      : 'M22 14H6M12 8l-6 6 6 6'   // стрелка влево (исходящий)
    return (
      <svg {...s}>
        <circle cx="14" cy="14" r="13" stroke={color} strokeWidth="0.8" opacity="0.3" />
        <path d={d} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (type === 'purchase') {
    return (
      <svg {...s}>
        <circle cx="14" cy="14" r="13" stroke="#c084fc" strokeWidth="0.8" opacity="0.3" />
        <path d="M9 10h10l-1.5 8H10.5L9 10z" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="11" cy="22" r="1.2" fill="#c084fc" />
        <circle cx="17" cy="22" r="1.2" fill="#c084fc" />
        <path d="M8 7h3" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  // transaction (начисление / списание)
  const isPlus = direction === 'in'
  const color = isPlus ? '#4ade80' : '#f87171'
  return (
    <svg {...s}>
      <circle cx="14" cy="14" r="13" stroke={color} strokeWidth="0.8" opacity="0.3" />
      {isPlus ? (
        <path d="M14 8v12M8 14h12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M8 14h12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  )
}

export default function History() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [transfers, setTransfers] = useState([])
  const [purchases, setPurchases] = useState([])
  const [namesMap, setNamesMap] = useState({})
  const [filter, setFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
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

    const userIds = new Set()
    ;(tr || []).forEach(t => { userIds.add(t.from_user_id); userIds.add(t.to_user_id) })
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, email')
        .in('user_id', Array.from(userIds))
      const map = {}
      ;(profiles || []).forEach(p => {
        map[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ')
          || p.display_name || p.email || 'Неизвестный'
      })
      setNamesMap(map)
    }
  }

  const allOperations = [
    ...transactions.map(t => ({ ...t, type: 'transaction' })),
    ...transfers.map(t => ({ ...t, type: 'transfer' })),
    ...purchases.map(p => ({ ...p, type: 'purchase' }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const filtered = allOperations.filter(op => {
    if (filter === 'income') {
      if (!((op.type === 'transaction' && op.amount > 0) || (op.type === 'transfer' && user && op.to_user_id === user.id))) return false
    } else if (filter === 'expense') {
      if (!((op.type === 'transaction' && op.amount < 0) || (op.type === 'transfer' && user && op.from_user_id === user.id) || op.type === 'purchase')) return false
    } else if (filter === 'transfer') {
      if (op.type !== 'transfer') return false
    }
    if (dateFrom) {
      const from = new Date(dateFrom); from.setHours(0, 0, 0, 0)
      if (new Date(op.created_at) < from) return false
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23, 59, 59, 999)
      if (new Date(op.created_at) > to) return false
    }
    return true
  })

  const paginated = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  useEffect(() => { setPage(0) }, [filter, dateFrom, dateTo])

  const getName = (uid) => namesMap[uid] || uid?.slice(0, 8) + '…'

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      {/* Шапка: стрелка на главную + заголовок */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/')}
          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          title="На главную"
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"
            className="transition-transform group-hover:-translate-x-1">
            <circle cx="14" cy="14" r="13" stroke="rgba(249,115,22,.4)" strokeWidth="0.8" />
            <path d="M17 8l-6 6 6 6" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-white">История операций</h1>
      </div>

      <div className="premium-card mb-6">
        {/* Фильтры по типу */}
        <div className="flex gap-2 flex-wrap mb-4">
          {['all', 'income', 'expense', 'transfer'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`filter-pill ${filter === f ? 'active' : ''}`}
            >
              {f === 'all' ? 'Все' : f === 'income' ? 'Начисления' : f === 'expense' ? 'Списания' : 'Переводы'}
            </button>
          ))}
        </div>

        {/* Фильтры по дате */}
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">С даты</label>
            <input type="date" className="input-field" style={{ width: 160 }}
              value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">По дату</label>
            <input type="date" className="input-field" style={{ width: 160 }}
              value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }}
              className="text-xs text-gray-400 hover:text-white underline mb-1">
              сбросить даты
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {paginated.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">Нет операций за выбранный период</p>
        )}
        {paginated.map(op => {
          const isIncoming = (op.type === 'transaction' && op.amount >= 0)
            || (user && op.type === 'transfer' && op.to_user_id === user.id)

          let title
          if (op.type === 'transfer') {
            title = user && op.from_user_id === user.id
              ? `Перевод → ${getName(op.to_user_id)}`
              : `Перевод от ${getName(op.from_user_id)}`
          } else if (op.type === 'purchase') {
            title = `Покупка: ${op.reward_name}`
          } else {
            title = op.description || 'Операция'
          }

          let amountText
          if (op.type === 'transaction') amountText = (op.amount > 0 ? '+' : '') + op.amount
          else if (op.type === 'transfer') amountText = (user && op.from_user_id === user.id ? '-' : '+') + op.amount
          else if (op.type === 'purchase') amountText = '-' + op.cost

          const dir = isIncoming ? 'in' : 'out'

          return (
            <div key={op.id + op.type} className="premium-card flex items-center gap-4">
              {/* Иконка типа операции */}
              <div className="flex-shrink-0">
                <OpIcon type={op.type} direction={dir} />
              </div>

              {/* Текст */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{title}</p>
                <p className="text-xs text-gray-400">{new Date(op.created_at).toLocaleString('ru')}</p>
              </div>

              {/* Сумма */}
              <span className={`font-semibold flex-shrink-0 ${isIncoming ? 'text-green-400' : 'text-red-400'}`}>
                {amountText}
              </span>
            </div>
          )
        })}
      </div>

      {filtered.length > ITEMS_PER_PAGE && (
        <div className="flex justify-between mt-6">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="btn-outline text-sm">Назад</button>
          <span className="text-xs text-gray-500 self-center">
            {page + 1} из {Math.ceil(filtered.length / ITEMS_PER_PAGE)}
          </span>
          <button onClick={() => setPage(p => p + 1)}
            disabled={(page + 1) * ITEMS_PER_PAGE >= filtered.length}
            className="btn-outline text-sm">Вперед</button>
        </div>
      )}
    </div>
  )
}
