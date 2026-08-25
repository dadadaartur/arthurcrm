import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import BackArrow from '../components/BackArrow'
import { useFeedback } from '../context/ActionFeedbackContext'

// РАНЬШЕ получатель выбирался вводом email вручную. Теперь — поиск по
// коллегам из своей же компании (имя/фамилия/email) с выпадающим списком.
// Список коллег читается напрямую с клиента: RLS-политика "Company members
// view colleagues" на profiles уже разрешает видеть всех сотрудников своей
// компании, отдельный API-роут для этого не нужен.
export default function Transfer() {
  const { showSuccess, showError } = useFeedback()
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
        showSuccess('Перевод выполнен')
      }
    } catch (err) {
      console.error('[transfer] client error', err)
      setError('Сетевая ошибка: ' + (err?.message || 'не удалось связаться с сервером'))
    }
    setLoading(false)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <BackArrow href="/" title="Перевод кармиков" />
      <div className="premium-card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, padding: '14px 18px', borderRadius: 16, background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)' }}>
          <span style={{ fontSize: 12, color: '#999' }}>Ваш баланс</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#FFD700' }}>{balance} кармиков</span>
        </div>

        <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Кому</label>
            {selected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14, background: 'rgba(160,233,255,0.06)', border: '1px solid rgba(160,233,255,0.3)' }}>
                {selected.avatar_url ? (
                  <img src={selected.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(160,233,255,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#a0e9ff', fontWeight: 600 }}>
                    {colleagueName(selected).charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{colleagueName(selected)}</div>
                  {selected.email && <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.email}</div>}
                </div>
                <button type="button" onClick={clearSelection} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', flexShrink: 0, padding: 4 }} title="Выбрать другого">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
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
                {dropdownOpen && !colleaguesLoading && (
                  <div style={{ position: 'absolute', zIndex: 20, marginTop: 6, width: '100%', maxHeight: 260, overflowY: 'auto', borderRadius: 14, border: '1px solid rgba(255,215,0,0.25)', background: 'rgba(20,25,45,0.97)', backdropFilter: 'blur(16px)', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
                    {filteredColleagues.length === 0 ? (
                      <div style={{ padding: '10px 14px', fontSize: 13, color: '#777' }}>Никого не найдено</div>
                    ) : (
                      filteredColleagues.map(c => (
                        <button
                          type="button"
                          key={c.user_id}
                          onClick={() => selectColleague(c)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.08)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                        >
                          {c.avatar_url ? (
                            <img src={c.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,215,0,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#FFD700' }}>
                              {colleagueName(c).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{colleagueName(c)}</div>
                            {c.email && <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Сумма</label>
            <input
              type="number"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="input-field"
              style={{ fontSize: 18, fontWeight: 600 }}
              min="1"
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Комментарий (необязательно)</label>
            <input
              type="text"
              placeholder="За помощь с отчётом"
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="input-field"
            />
          </div>

          {error && <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" className="btn-gold w-full" disabled={loading || !selected}>
            {loading ? 'Отправка...' : 'Отправить'}
          </button>
        </form>
      </div>
    </div>
  )
}
