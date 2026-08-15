import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import DateRangePicker from '../components/DateRangePicker'

// Премиальные SVG-иконки типов операций — тонкие линии, стиль банка.
function OpIcon({ type, direction }) {
  const s = { width: 28, height: 28, viewBox: '0 0 28 28', fill: 'none' }
  if (type === 'transfer') {
    const color = direction === 'in' ? '#4ade80' : '#f87171'
    const d = direction === 'in'
      ? 'M6 14h16M16 8l6 6-6 6'
      : 'M22 14H6M12 8l-6 6 6 6'
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

// Тонкий фирменный глиф комментария (речевой пузырь, свои линии)
function CommentGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 1.8c-3.1 0-5.6 2.1-5.6 4.7 0 1.5.8 2.8 2.1 3.7v2.3l2.6-1.4c.3.05.6.07.9.07 3.1 0 5.6-2.1 5.6-4.7S10.1 1.8 7 1.8z"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="4.8" cy="6.5" r="0.55" fill="currentColor" />
      <circle cx="7" cy="6.5" r="0.55" fill="currentColor" />
      <circle cx="9.2" cy="6.5" r="0.55" fill="currentColor" />
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
  // Открытый комментарий: { text, fromName, date } или null
  const [commentModal, setCommentModal] = useState(null)
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2 flex-wrap">
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

          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={({ from, to }) => { setDateFrom(from); setDateTo(to) }}
          />
        </div>
      </div>

      {/* Строки истории: по две на линии на десктопе */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {paginated.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8 lg:col-span-2">Нет операций за выбранный период</p>
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

          const hasComment = op.type === 'transfer' && op.comment && String(op.comment).trim()

          return (
            <div
              key={op.id + op.type}
              className="premium-card flex items-center gap-3"
              style={{ padding: '16px 20px' }}
            >
              <div className="flex-shrink-0">
                <OpIcon type={op.type} direction={isIncoming ? 'in' : 'out'} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm truncate">{title}</p>
                <p className="text-xs text-gray-400">{new Date(op.created_at).toLocaleString('ru')}</p>

                {/* Кнопка комментария — видна отправителю и получателю,
                    если при переводе был написан комментарий */}
                {hasComment && (
                  <button
                    onClick={() => setCommentModal({
                      text: String(op.comment).trim(),
                      fromName: getName(op.from_user_id),
                      date: new Date(op.created_at).toLocaleString('ru'),
                    })}
                    className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-[#D4AF37] hover:text-[#FFD700] transition-colors"
                  >
                    <CommentGlyph />
                    Комментарий
                  </button>
                )}
              </div>

              <span className={`font-semibold text-sm whitespace-nowrap ${isIncoming ? 'text-green-400' : 'text-red-400'}`}>
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

      {/* Красивое окно комментария к переводу */}
      {commentModal && (
        <div className="modal-overlay" onClick={() => setCommentModal(null)}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 440, textAlign: 'left' }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3
                className="text-lg font-bold"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #c084fc)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                Комментарий к переводу
              </h3>
              <button onClick={() => setCommentModal(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {/* Цитата с фирменной золотой линией слева */}
            <div
              style={{
                position: 'relative',
                background: 'rgba(15,31,53,.6)',
                border: '1px solid rgba(249,115,22,.3)',
                borderLeft: '3px solid #D4AF37',
                borderRadius: 14,
                padding: '18px 20px',
                overflow: 'hidden',
              }}
            >
              {/* Большая декоративная кавычка */}
              <div
                style={{
                  position: 'absolute',
                  top: -6,
                  left: 10,
                  fontSize: 56,
                  lineHeight: 1,
                  fontFamily: 'Georgia, serif',
                  background: 'linear-gradient(135deg, rgba(212,175,55,.5), rgba(192,132,252,.35))',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  pointerEvents: 'none',
                }}
              >
                «
              </div>
              <p className="text-white text-sm leading-relaxed" style={{ position: 'relative', paddingTop: 10 }}>
                {commentModal.text}
              </p>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
              <span className="font-semibold" style={{ color: '#FFD700' }}>{commentModal.fromName}</span>
              <span>·</span>
              <span>{commentModal.date}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
