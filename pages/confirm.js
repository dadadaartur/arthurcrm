import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function Confirm() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pendingEvents, setPendingEvents] = useState([])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
      else {
        setUser(user)
        fetchPending()
      }
    }
    checkUser()
  }, [])

  async function fetchPending() {
    const { data } = await supabase
      .from('karma_events')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setPendingEvents(data || [])
  }

  async function handleConfirm(eventId, role) {
    // role: 'manager', 'hr', 'senior'
    const { error } = await supabase
      .from('karma_events')
      .update({ status: 'approved', confirmed_by: supabase.auth.user().id, confirmed_role: role })
      .eq('id', eventId)
    if (!error) fetchPending()
    else alert('Ошибка подтверждения')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-deep-blue mb-6">Подтверждение значимых событий</h1>
      {pendingEvents.length === 0 ? (
        <p className="text-gray-500">Нет событий, ожидающих подтверждения</p>
      ) : (
        <ul className="space-y-4">
          {pendingEvents.map(event => (
            <li key={event.id} className="premium-card">
              <p className="font-medium">{event.description}</p>
              <p className="text-sm text-gray-500">Сумма: {event.amount}</p>
              <div className="mt-3 flex gap-3">
                <button onClick={() => handleConfirm(event.id, 'manager')} className="btn-outline text-xs">Подтвердить как руководитель</button>
                <button onClick={() => handleConfirm(event.id, 'hr')} className="btn-outline text-xs">Подтвердить как HR</button>
                <button onClick={() => handleConfirm(event.id, 'senior')} className="btn-outline text-xs">Подтвердить как вышестоящий</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
