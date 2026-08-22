import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import PremiumModal from '../components/PremiumModal'

// РАНЬШЕ получатель выбирался вводом email вручную. Теперь — поиск по
// коллегам из своей же компании (имя/фамилия/email) с выпадающим списком.
// Список коллег читается напрямую с клиента: RLS-политика "Company members
// view colleagues" на profiles уже разрешает видеть всех сотрудников своей
// компании, отдельный API-роут для этого не нужен.
export default function Transfer() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [colleagues, setColleagues] = useState([])
  const [colleaguesLoading, setColleaguesLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selected, setSelected] = useState(null) // { user_id, display_name, email, avatar_url }
  const [amount, setAmount] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data: balData } = await supabase
        .from('karma_balance')
        .select('balance')
        .eq('user_id', user.id)
        .single()
      if (balData) setBalance(balData.balance)

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single()

      if (profile?.company_id) {
        const { data: colleaguesData, error: colError } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name, email, avatar_url')
          .eq('company_id', profile.company_id)
          .is('deleted_at', null)
          .neq('user_id', user.id)
          .order('first_name', { ascending: true })

        if (!colError) setColleagues(colleaguesData || [])
      }
      setColleaguesLoading(false)
    }
    init()
  }, [])

  // Закрываем выпадающий список по клику снаружи
  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const colleagueName = (c) =>
    c.display_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Без имени'

  const filteredColleagues = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return colleagues
    return colleagues.filter(c => {
      const haystack = [c.display_name, c.first_name, c.last_name, c.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [colleagues, search])

  const selectColleague = (c) => {
    setSelected(c)
    setSearch(colleagueName(c))
    setDropdownOpen(false)
    setError('')
  }

  const clearSelection = () => {
    setSelected(null)
    setSearch('')
  }

  const handleTransfer = async (e) => {
    e.preventDefault()
    setError('')
    const transferAmount = parseInt(amount, 10)
    if (!selected || !transferAmount || transferAmount <= 0) {
      setError('Выберите коллегу и укажите сумму')
      return
    }
    if (transferAmount > balance) {
      setError('Недостаточно кармиков')
      return
    }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) {
        setError('Не удалось получить токен доступа')
        setLoading(false)
        return
      }

      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ recipientId: selected.user_id, amount: transferAmount, comment })
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Ошибка перевода')
      } else {
        setBalance(result.newBalance)
        clearSelection()
        setAmount('')
        setComment('')
        setShowModal(true)
      }
    } catch (err) {
      setError('Сетевая ошибка')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="premium-card">
        <h2 className="text-2xl font-bold text-white mb-6">Перевод кармиков</h2>
        <div className="text-sm text-gray-400 mb-4">
          Ваш баланс: <span className="text-gold font-semibold">{balance}</span> кармиков
        </div>
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="relative" ref={wrapRef}>
            <input
              type="text"
              placeholder={colleaguesLoading ? 'Загрузка коллег...' : 'Начните вводить имя или email'}
              value={search}
              disabled={colleaguesLoading}
              onChange={e => {
                setSearch(e.target.value)
                setSelected(null)
                setDropdownOpen(true)
              }}
              onFocus={() => setDropdownOpen(true)}
              className="input-field"
              autoComplete="off"
              required
            />
            {selected && (
              <button
                type="button"
                onClick={clearSelection}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm"
                title="Очистить выбор"
              >
                ✕
              </button>
            )}
            {dropdownOpen && !colleaguesLoading && (
              <div
                className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 shadow-xl"
              >
                {filteredColleagues.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">Никого не найдено</div>
                ) : (
                  filteredColleagues.map(c => (
                    <button
                      type="button"
                      key={c.user_id}
                      onClick={() => selectColleague(c)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-800 transition-colors"
                    >
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-[10px] text-gray-300">
                          {colleagueName(c).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">{colleagueName(c)}</div>
                        {c.email && <div className="text-xs text-gray-500 truncate">{c.email}</div>}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <input
            type="number"
            placeholder="Сумма"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="input-field"
            min="1"
            required
          />
          <input
            type="text"
            placeholder="Комментарий"
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="input-field"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" className="btn-gold w-full" disabled={loading || !selected}>
            {loading ? 'Отправка...' : 'Отправить'}
          </button>
        </form>
      </div>
      <PremiumModal isOpen={showModal} onClose={() => setShowModal(false)} title="Перевод выполнен!">
        <p className="text-white">Операция записана в историю.</p>
      </PremiumModal>
    </div>
  )
}
