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
          <h3 className="text-xl font-bold text-gold">Уведомления</h3>
          <div className="flex gap-3 items-center">
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-blue-400 hover:text-blue-300">
                Прочитать все
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-2">
          {loading ? (
            <p className="text-gray-400 text-sm">Загрузка...</p>
          ) : notifications.length === 0 ? (
            <p className="text-gray-400 text-sm">Нет уведомлений</p>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${n.is_read ? 'bg-gray-800' : 'bg-gray-700 border border-yellow-600'}`}
                onClick={() => {
                  if (!n.is_read) markAsRead(n.id)
                  if (n.link) window.location.href = n.link
                }}
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm text-white">{n.message}</p>
                  {!n.is_read && (
                    <span className="w-2 h-2 bg-yellow-400 rounded-full ml-2 mt-1"></span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
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
