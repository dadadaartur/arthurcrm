import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import KarmaSuccess from './KarmaSuccess'

// Окно перевода кармиков.
// - Список коллег загружается сразу при открытии (не нужно помнить имена)
// - Поиск фильтрует список локально (мгновенно, без запросов к серверу)
// - Скролл в списке: максимум ~5 человек видно, дальше прокрутка с
//   фирменным золотым ползунком — работает хоть на 500 сотрудников
// - При успехе — фирменная анимация KarmaSuccess (гексаграмма, 12 точек-
//   кармиков по орбите, радиальные лучи, искры) вместо унылого текста
export default function TransferModal({ isOpen, onClose }) {
  const [colleagues, setColleagues] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [amount, setAmount] = useState('')
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  // При открытии модалки: сбрасываем форму и грузим всех коллег компании
  useEffect(() => {
    if (!isOpen) return

    setLoading(true)
    setQuery('')
    setSelected(null)
    setAmount('')
    setComment('')
    setError('')
    setSending(false)
    setSuccess(null)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.access_token) {
        setLoading(false)
        return
      }
      try {
        const r = await fetch('/api/colleagues/search', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const d = await r.json()
        setColleagues(Array.isArray(d) ? d : [])
      } catch {
        setColleagues([])
      } finally {
        setLoading(false)
      }
    })
  }, [isOpen])

  if (!isOpen) return null

  // Локальная фильтрация по запросу — мгновенно, без сетевых задержек
  const filtered = query.trim()
    ? colleagues.filter(p => {
        const q = query.toLowerCase()
        return (
          (p.name || '').toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q) ||
          (p.position || '').toLowerCase().includes(q)
        )
      })
    : colleagues

  // Успех: вместо формы показываем фирменную анимацию
  if (success) {
    return (
      <KarmaSuccess
        show
        amount={success.amount}
        recipientName={success.name}
        onClose={() => onClose?.()}
      />
    )
  }

  const canSubmit = !!selected && parseInt(amount, 10) > 0 && !sending

  const submit = async () => {
    if (!canSubmit) return
    setSending(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Сессия истекла — обновите страницу')
        setSending(false)
        return
      }
      const r = await fetch('/api/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          recipientId: selected.user_id,
          amount: parseInt(amount, 10),
          comment: comment.trim() || null,
        }),
      })
      const d = await r.json()
      if (!r.ok) {
        setError(d.error || 'Ошибка перевода')
        setSending(false)
        return
      }
      setSuccess({ amount: parseInt(amount, 10), name: selected.name })
    } catch {
      setError('Сетевая ошибка — попробуйте ещё раз')
      setSending(false)
    }
  }

  const initials = (p) => {
    const parts = (p.name || p.email || '?').trim().split(/\s+/)
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content transfer-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 520, textAlign: 'left' }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3
            className="text-xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #f97316, #c084fc)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Перевести кармики
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Поиск */}
        <label className="text-xs text-gray-400 mb-1 block">Найдите коллегу по имени</label>
        <input
          className="input-field"
          placeholder="Начните вводить имя или фамилию…"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null) }}
          autoFocus
        />

        {/* Список коллег со скроллом */}
        <div
          className="transfer-colleagues-list mt-3 space-y-1.5"
          style={{ minHeight: 32 }}
        >
          {loading && <p className="text-xs text-gray-500">Загружаем коллег…</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-xs text-gray-500">
              {query ? 'Никого не нашли' : 'В вашей компании пока нет других сотрудников'}
            </p>
          )}
          {!loading && filtered.map(p => (
            <button
              key={p.user_id}
              onClick={() => { setSelected(p); setQuery('') }}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left"
              style={{
                border: selected?.user_id === p.user_id
                  ? '1px solid rgba(212,175,55,.6)'
                  : '1px solid rgba(249,115,22,.25)',
                background: selected?.user_id === p.user_id
                  ? 'rgba(212,175,55,.08)'
                  : 'rgba(15,31,53,.6)',
              }}
            >
              {p.avatar_url
                ? <img src={p.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                : (
                  <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-white">
                    {initials(p)}
                  </div>
                )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{p.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {[p.position, p.email].filter(Boolean).join(' · ')}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Выбранный получатель */}
        {selected && (
          <div className="mt-3 flex items-center gap-2 text-sm flex-wrap">
            <span className="text-gray-500 text-xs">Получатель:</span>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ border: '1px solid rgba(212,175,55,.5)', color: '#FFD700', background: 'rgba(212,175,55,.08)' }}
            >
              {selected.name}
            </span>
            <button
              className="text-xs text-gray-500 hover:text-gray-300 underline"
              onClick={() => { setSelected(null); setQuery('') }}
            >
              изменить
            </button>
          </div>
        )}

        {/* Сумма */}
        <label className="text-xs text-gray-400 mb-1 block mt-4">Сколько кармиков</label>
        <input
          className="input-field"
          type="number"
          min="1"
          placeholder="Например, 20"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />

        {/* Комментарий */}
        <label className="text-xs text-gray-400 mb-1 block mt-4">Комментарий (необязательно)</label>
        <input
          className="input-field"
          placeholder="За что благодарите"
          value={comment}
          maxLength={200}
          onChange={e => setComment(e.target.value)}
        />

        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="btn-gold w-full mt-5"
          style={{ opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
        >
          {sending ? 'Переводим…' : 'Перевести'}
        </button>

        {/* Кастомный скроллбар для списка коллег — золотой, тонкий,
            гармонирует с остальным дизайном проекта */}
        <style jsx>{`
          .transfer-colleagues-list {
            max-height: 288px;
            overflow-y: auto;
            padding-right: 4px;
            scrollbar-width: thin;
            scrollbar-color: rgba(249,115,22,0.4) transparent;
          }
          .transfer-colleagues-list::-webkit-scrollbar {
            width: 8px;
          }
          .transfer-colleagues-list::-webkit-scrollbar-track {
            background: transparent;
          }
          .transfer-colleagues-list::-webkit-scrollbar-thumb {
            background: rgba(249,115,22,0.4);
            border-radius: 10px;
            border: 2px solid transparent;
            background-clip: padding-box;
          }
          .transfer-colleagues-list::-webkit-scrollbar-thumb:hover {
            background: rgba(249,115,22,0.65);
            background-clip: padding-box;
          }
        `}</style>
      </div>
    </div>
  )
}
