import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import BackArrow from '../components/BackArrow'
import DateRangePicker from '../components/DateRangePicker'

// Подписи и иконки по типу операции — чтобы сразу было видно, откуда
// начисление (задание/цель/тест/перевод/покупка), а не только читать
// сплошное предложение в description. Цвета — насыщенные версии
// (не пастельные), чтобы читались как текст на светлом фоне.
const TX_TYPE = {
  task_reward: { label: 'Задание', color: '#16a34a' },
  task_review: { label: 'Проверка задания', color: '#16a34a' },
  kpi_bonus: { label: 'Цель (KPI)', color: '#0e7490' },
  test_reward: { label: 'Тестирование', color: '#7c3aed' },
}
const TypeIcon = ({ kind, color }) => {
  const paths = {
    transfer: <path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />,
    purchase: <><path d="M6 2l1.5 5h9L18 2" /><path d="M3.5 7h17l-1.5 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" /></>,
    task_reward: <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />,
    task_review: <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />,
    kpi_bonus: <path d="M3 3v18h18M18.7 8l-5.1 5.1-2.8-2.8L7 14" />,
    test_reward: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
    default: <circle cx="12" cy="12" r="9" />,
  }
  return (
    <span style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[kind] || paths.default}</svg>
    </span>
  )
}

export default function History() {
  const [user, setUser] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [transfers, setTransfers] = useState([])
  const [purchases, setPurchases] = useState([])
  const [filter, setFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const ITEMS_PER_PAGE = 12

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
    if (filter === 'income' && !((op.type === 'transaction' && op.amount > 0) || (op.type === 'transfer' && op.to_user_id === user.id))) return false
    if (filter === 'expense' && !((op.type === 'transaction' && op.amount < 0) || (op.type === 'transfer' && op.from_user_id === user.id) || op.type === 'purchase')) return false
    if (filter === 'transfer' && op.type !== 'transfer') return false
    if (dateFrom && new Date(op.created_at) < new Date(dateFrom + 'T00:00:00')) return false
    if (dateTo && new Date(op.created_at) > new Date(dateTo + 'T23:59:59')) return false
    return true
  })

  const paginated = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  if (!user) return null

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto' }} className="theme-light px-4 py-10">
      <div className="premium-card mb-6">
        <BackArrow href="/" title="История операций" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div className="flex gap-2 flex-wrap">
            {['all', 'income', 'expense', 'transfer'].map(f => (
              <button key={f} onClick={() => { setFilter(f); setPage(0) }} className={`filter-pill ${filter === f ? 'active' : ''}`}>
                {f === 'all' ? 'Все' : f === 'income' ? 'Начисления' : f === 'expense' ? 'Списания' : 'Переводы'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Период:</span>
            <DateRangePicker from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(0) }} />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="premium-card text-center" style={{ color: 'var(--text-muted)', padding: '50px 0' }}>Операций за выбранный период не найдено</div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {paginated.map(op => {
          const txMeta = op.type === 'transaction' ? TX_TYPE[op.type] : null
          const color = op.type === 'transfer' ? '#0e7490' : op.type === 'purchase' ? '#dc2626' : (txMeta?.color || '#b8860b')
          const isPositive = (op.type === 'transaction' && op.amount >= 0) || (op.type === 'transfer' && op.to_user_id === user.id)
          return (
            <div key={op.id + op.type} className="premium-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <TypeIcon kind={op.type === 'transaction' ? op.type : op.type} color={color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color }}>
                      {op.type === 'transfer' ? 'Перевод' : op.type === 'purchase' ? 'Покупка' : (TX_TYPE[op.type]?.label || 'Начисление')}
                    </span>
                    <p className="font-medium" style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {op.type === 'transfer' ? (
                        op.from_user_id === user.id ? 'Исходящий перевод' : 'Входящий перевод'
                      ) : op.type === 'purchase' ? (
                        `${op.reward_name}`
                      ) : (
                        op.description
                      )}
                    </p>
                  </div>
                  <span className="font-semibold" style={{ whiteSpace: 'nowrap', fontSize: 15, color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {op.type === 'transaction' ? (op.amount > 0 ? '+' : '') + op.amount :
                     op.type === 'transfer' ? (op.from_user_id === user.id ? '-' : '+') + op.amount :
                     op.type === 'purchase' ? '-' + op.cost : ''}
                  </span>
                </div>
                {op.type === 'transfer' && op.counterpart && (
                  <p className="text-sm mt-1" style={{ color: 'var(--accent-cyan)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {op.from_user_id === user.id ? 'Кому: ' : 'От: '}{op.counterpart.name}
                    <span style={{ color: 'var(--text-muted)' }}> · {op.counterpart.email}{op.counterpart.department ? ` · ${op.counterpart.department}` : ''}</span>
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{new Date(op.created_at).toLocaleString('ru')}</p>
              </div>
            </div>
          )
        })}
      </div>
      )}

      {filtered.length > ITEMS_PER_PAGE && (
        <div className="flex justify-between mt-6">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-outline text-sm">Назад</button>
          <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * ITEMS_PER_PAGE >= filtered.length} className="btn-outline text-sm">Вперед</button>
        </div>
      )}
    </div>
  )
}
