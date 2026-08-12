import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function NotificationsModal({ isOpen, onClose, userId }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && userId) {
      loadNotifications()
    }
  }, [isOpen, userId])

  const loadNotifications = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
    setLoading(false)
  }

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllAsRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  if (!isOpen) return null

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '28px', textAlign: 'left' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold" style={{ fontFamily: 'var(--lumen-font-display)', color: 'var(--lumen-ink)' }}>Уведомления</h3>
          <div className="flex gap-3 items-center">
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs" style={{ color: 'var(--lumen-violet)' }}>
                Прочитать все
              </button>
            )}
            <button onClick={onClose} className="text-[var(--lumen-ink-faint)] hover:text-[var(--lumen-ink)]">✕</button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-2">
          {loading ? (
            <p className="text-[var(--lumen-ink-soft)] text-sm">Загрузка...</p>
          ) : notifications.length === 0 ? (
            <p className="text-[var(--lumen-ink-soft)] text-sm">Нет уведомлений</p>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className="p-3 rounded-lg cursor-pointer transition-colors"
                style={{
                  background: n.is_read ? 'var(--lumen-surface-2)' : 'rgba(184,147,76,0.08)',
                  border: n.is_read ? '1px solid var(--lumen-line)' : '1px solid var(--lumen-gold-glow)'
                }}
                onClick={() => {
                  if (!n.is_read) markAsRead(n.id)
                  if (n.link) window.location.href = n.link
                }}
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm" style={{ color: 'var(--lumen-ink)' }}>{n.message}</p>
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full ml-2 mt-1" style={{ background: 'var(--lumen-gold)' }}></span>
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--lumen-ink-faint)' }}>
                  {new Date(n.created_at).toLocaleString('ru')}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
