import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { useProfile } from '../context/ProfileContext'

export default function NotificationBell() {
  const { user } = useProfile()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    try {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (res.ok) {
        const d = await res.json()
        setItems(d.notifications || [])
        setUnread(d.unreadCount || 0)
      }
    } catch (e) {}
  }

  useEffect(() => { if (user) load() }, [user])

  const markAll = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
    })
    setUnread(0)
    setItems(p => p.map(n => ({ ...n, read: true })))
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => { const next = !open; setOpen(next); if (next && unread > 0) markAll() }}
        className="action-btn !py-1.5 !px-3"
        style={{ position: 'relative', cursor: 'pointer', color: '#fff' }}
        title="Уведомления"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, padding: '0 5px',
            borderRadius: 9999, background: 'linear-gradient(135deg, #FFD700, #f97316)',
            color: '#0a1628', fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 10px rgba(255,215,0,.7)'
          }}>{unread}</span>
        )}
      </button>

      {open && (
        <div className="premium-card" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 320, maxHeight: 380, overflowY: 'auto', zIndex: 60, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Уведомления</span>
            {items.length > 0 && (
              <button onClick={markAll} style={{ fontSize: 11, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>
                Прочитать все
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p style={{ fontSize: 13, color: '#777', textAlign: 'center', padding: '14px 0' }}>Нет уведомлений</p>
          ) : (
            items.map(n => (
              <div
                key={n.id}
                onClick={() => { if (n.link) router.push(n.link); setOpen(false) }}
                style={{
                  padding: 10, borderRadius: 10, cursor: 'pointer', marginBottom: 6,
                  background: n.read ? 'rgba(255,255,255,0.03)' : 'rgba(255,215,0,0.08)',
                  borderLeft: n.read ? '2px solid transparent' : '2px solid #FFD700',
                }}
              >
                <p style={{ fontSize: 13, color: '#eee', margin: 0 }}>{n.message}</p>
                <p style={{ fontSize: 11, color: '#777', margin: '4px 0 0' }}>{new Date(n.created_at).toLocaleString('ru')}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
