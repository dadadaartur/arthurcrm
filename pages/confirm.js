import { useEffect, useState } from 'react'
import LoadingScreen from '../components/LoadingScreen'
import { supabase } from '../lib/supabaseClient'
import { useFeedback } from '../context/ActionFeedbackContext'
import BackArrow from '../components/BackArrow'

export default function Confirm() {
  const { showError } = useFeedback()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [pendingEvents, setPendingEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)
      const { data: p } = await supabase
        .from('profiles')
        .select('role_id, company_id')
        .eq('user_id', user.id)
        .single()
      setProfile(p)
      if (p && (p.role_id === 1 || p.role_id === 2 || p.role_id === 4)) {
        fetchPending(p.company_id)
      }
      setLoading(false)
    }
    init()
  }, [])

  async function fetchPending(companyId) {
    const { data } = await supabase
      .from('karma_events')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    // Показываем только события сотрудников своей компании
    const filtered = data?.filter(event => event.user_id !== user.id) || []
    setPendingEvents(filtered)
  }

  async function handleConfirm(eventId, role) {
    const { error } = await supabase
      .from('karma_events')
      .update({ status: 'approved', confirmed_by: user.id, confirmed_role: role })
      .eq('id', eventId)
    if (!error) {
      fetchPending(profile.company_id)
    } else {
      showError('Ошибка: недостаточно прав или событие уже обработано')
    }
  }

  if (loading) return <LoadingScreen />

  if (!profile || ![1,2,4].includes(profile.role_id)) {
    return (
      <div className="theme-light max-w-4xl mx-auto px-4 py-8">
        <BackArrow href="/" title="Подтверждение событий" />
        <p style={{ color: 'var(--text-secondary)' }}>У вас нет прав для подтверждения событий.</p>
      </div>
    )
  }

  return (
    <div className="theme-light max-w-4xl mx-auto px-4 py-8">
      <BackArrow href="/" title="Подтверждение значимых событий" />
      {pendingEvents.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Нет событий, ожидающих подтверждения</p>
      ) : (
        <ul className="space-y-4">
          {pendingEvents.map(event => (
            <li key={event.id} className="premium-card">
              <p className="font-medium">{event.description}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Сумма: {event.amount}</p>
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
