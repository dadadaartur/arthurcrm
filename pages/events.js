import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function Events() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [isSignificant, setIsSignificant] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
      else {
        setUser(user)
        fetchEvents(user.id)
      }
    }
    checkUser()
  }, [])

  async function fetchEvents(userId) {
    const { data } = await supabase
      .from('karma_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setEvents(data || [])
  }

  async function handleCreateEvent(e) {
    e.preventDefault()
    if (!description || !amount) return
    const { error } = await supabase.from('karma_events').insert({
      user_id: user.id,
      description,
      amount: parseInt(amount),
      is_significant: isSignificant,
      status: isSignificant ? 'pending' : 'auto_approved'
    })
    if (!error) {
      setDescription('')
      setAmount('')
      setIsSignificant(false)
      fetchEvents(user.id)
    } else {
      alert('Ошибка создания события')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-deep-blue mb-6">Журнал событий</h1>

      <div className="premium-card mb-8">
        <h2 className="text-xl font-semibold mb-4">Зафиксировать новое событие</h2>
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <input
            type="text"
            placeholder="Описание (например, выполнил план продаж)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="input-field"
            required
          />
          <input
            type="number"
            placeholder="Количество баллов (+/-)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="input-field"
            required
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSignificant}
              onChange={e => setIsSignificant(e.target.checked)}
            />
            <span className="text-sm">Значимое событие (требует подтверждения)</span>
          </label>
          <button type="submit" className="btn-gold">Записать событие</button>
        </form>
      </div>

      <div className="premium-card">
        <h2 className="text-xl font-semibold mb-4">Мои события</h2>
        {events.length === 0 ? (
          <p className="text-gray-500">Нет событий</p>
        ) : (
          <ul className="space-y-3">
            {events.map(event => (
              <li key={event.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">{event.description}</p>
                  <p className="text-xs text-gray-400">
                    Статус: {event.status === 'auto_approved' ? 'Автоматически одобрено' :
                             event.status === 'pending' ? 'Ожидает подтверждения' :
                             event.status === 'approved' ? 'Подтверждено' : 'Отклонено'}
                  </p>
                </div>
                <span className={event.amount >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {event.amount > 0 ? '+' : ''}{event.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
