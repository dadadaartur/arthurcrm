import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabaseClient'

// Типы событий и их фирменные цвета (включая финансовые)
const TYPE_META = {
  transfer:        { color: '#4ade80' },
  task_new:        { color: '#f97316' },
  task_review:     { color: '#FFD700' },
  task_done:       { color: '#7AC78F' },
  purchase:        { color: '#c084fc' },
  purchase_review: { color: '#D4AF37' },
  shop:            { color: '#D4AF37' },
  topup:           { color: '#4ade80' },
  tariff_change:   { color: '#a0e9ff' },
  emission:        { color: '#FFD700' },
  system:          { color: '#9aa9c1' },
}

function inferType(n) {
  if (n.type && TYPE_META[n.type]) return n.type
  if (/пополнен/i.test(n.message || '')) return 'topup'
  if (/тариф/i.test(n.message || '')) return 'tariff_change'
  if (n.link === '/history') return 'transfer'
  if (n.link === '/my-purchases') return 'purchase'
  if (n.link === '/company-admin/purchases') return 'purchase_review'
  if (n.link === '/company-admin/review') return 'task_review'
  if (n.link === '/tasks') return 'task_done'
  return 'system'
}

function TypeIcon({ type }) {
  const color = (TYPE_META[type] || TYPE_META.system).color
  const paths = {
    transfer: (
      <>
        <path d="M4 9h13M13.5 5.5L17 9l-3.5 3.5" />
        <path d="M20 15H7M10.5 11.5L7 15l3.5 3.5" />
      </>
    ),
    task_new: (
      <>
        <path d="M12 3l7 9-7 9-7-9 7-9z" />
        <path d="M12 8v8M8 12h8" />
      </>
    ),
    task_review: (
      <>
        <path d="M12 3l7 9-7 9-7-9 7-9z" />
        <path d="M12 8.5V13l2.8 1.6" />
      </>
    ),
    task_done: (
      <>
        <path d="M12 3l7 9-7 9-7-9 7-9z" />
        <path d="M9 12.5l2 2 4-4.5" />
      </>
    ),
    purchase: (
      <>
        <path d="M6.5 8.5h11l-.9 10.2a1.8 1.8 0 0 1-1.8 1.6H9.2a1.8 1.8 0 0 1-1.8-1.6L6.5 8.5z" />
        <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
      </>
    ),
    purchase_review: (
      <>
        <path d="M6.5 8.5h11l-.9 10.2a1.8 1.8 0 0 1-1.8 1.6H9.2a1.8 1.8 0 0 1-1.8-1.6L6.5 8.5z" />
        <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
        <circle cx="17.5" cy="6" r="3" />
        <path d="M17.5 4.8v1.4l1 .7" />
      </>
    ),
    shop: (
      <>
        <path d="M5 10l1.2-5h11.6L19 10" />
        <path d="M5 10v9h14v-9" />
        <path d="M9.5 19v-5h5v5" />
      </>
    ),
    topup: (
      <>
        <path d="M12 3v10" />
        <path d="M8 9l4 4 4-4" />
        <path d="M4 17h16v4H4z" />
      </>
    ),
    tariff_change: (
      <path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 8.7l5.4-.8z" />
    ),
    emission: (
      <>
        <path d="M3 9l9-6 9 6" />
        <path d="M4 9v11h16V9" />
        <path d="M9 13v4M15 13v4" />
      </>
    ),
    system: (
      <path d="M12 4c.6 3.8 2.2 5.4 6 6-3.8.6-5.4 2.2-6 6-.6-3.8-2.2-5.4-6-6 3.8-.6 5.4-2.2 6-6z" />
    ),
  }
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center"
      style={{
        width: 34, height: 34, borderRadius: '50%',
        border: `1px solid ${color}55`,
        background: `${color}14`,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {paths[type] || paths.system}
      </svg>
    </div>
  )
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин назад`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ч назад`
  const d = Math.floor(h / 24)
  if (d === 1) return 'вчера'
  if (d < 7) return `${d} дн назад`
  return new Date(iso).toLocaleDateString('ru')
}

export default function NotificationsBell({ userId }) {
  const router = useRouter()
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [ringing, setRinging] = useState(false)
  const [panelPos, setPanelPos] = useState({ top: 60, right: 12 })
  const btnRef = useRef(null)
  const panelRef = useRef(null)

  const load = async () => {
    if (!userId) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    setItems(data || [])
  }

  useEffect(() => { load() }, [userId])

  // Realtime: новое уведомление прилетает без перезагрузки
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('notifications-' + userId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setItems(prev => [payload.new, ...prev.filter(x => x.id !== payload.new.id)])
        setRinging(true)
        setTimeout(() => setRinging(false), 1400)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  useEffect(() => {
    const onDoc = (e) => {
      const inBtn = btnRef.current && btnRef.current.contains(e.target)
      const inPanel = panelRef.current && panelRef.current.contains(e.target)
      if (!inBtn && !inPanel) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const unread = items.filter(n => !n.is_read).length

  const togglePanel = () => {
    const next = !open
    if (next && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPanelPos({
        top: rect.bottom + 10,
        right: Math.max(12, window.innerWidth - rect.right)
      })
    }
    setOpen(next)
    if (next) load()
  }

  const markRead = async (id) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }

  const markAllRead = async () => {
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
  }

  const openItem = (n) => {
    if (!n.is_read) markRead(n.id)
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  if (!userId) return null

  return (
    <>
      <style>{`
        @keyframes nb-ring {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(14deg); }
          30% { transform: rotate(-12deg); }
          45% { transform: rotate(9deg); }
          60% { transform: rotate(-6deg); }
          75% { transform: rotate(3deg); }
        }
        .nb-ringing { animation: nb-ring 1.3s ease-in-out; transform-origin: 50% 15%; }
        @keyframes nb-badge-pulse {
          0%, 100% { box-shadow: 0 0 6px rgba(212,175,55,.7); }
          50% { box-shadow: 0 0 14px rgba(212,175,55,1); }
        }
        .nb-badge { animation: nb-badge-pulse 2s ease-in-out infinite; }
      `}</style>

      <button
        ref={btnRef}
        onClick={togglePanel}
        className="relative flex items-center justify-center transition-transform hover:scale-110"
        style={{ width: 32, height: 32, cursor: 'pointer' }}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none"
          className={ringing ? 'nb-ringing' : ''}>
          <defs>
            <linearGradient id="nb-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>
          <path
            d="M12 3c-3.3 0-5.5 2.4-5.5 5.6 0 4.2-1.6 5.6-2.3 6.9-.2.4.1 1 .6 1h14.4c.5 0 .8-.6.6-1-.7-1.3-2.3-2.7-2.3-6.9C17.5 5.4 15.3 3 12 3z"
            stroke="url(#nb-grad)" strokeWidth="1.4" strokeLinejoin="round"
          />
          <path d="M9.8 19.5a2.3 2.3 0 0 0 4.4 0" stroke="url(#nb-grad)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>

        {unread > 0 && (
          <span
            className="nb-badge absolute flex items-center justify-center font-bold"
            style={{
              top: -2, right: -4,
              minWidth: 16, height: 16,
              padding: '0 4px',
              borderRadius: 9999,
              fontSize: 10,
              color: '#0a1628',
              background: 'linear-gradient(135deg, #FFD700, #f97316)',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Панель через портал — поверх любого фона, zIndex 2000 */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: panelPos.top,
            right: panelPos.right,
            width: 380,
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: 'calc(100vh - 90px)',
            zIndex: 2000,
            background: 'linear-gradient(145deg, #152238 0%, #0a1628 100%)',
            border: '1px solid rgba(212,175,55,.35)',
            borderRadius: 20,
            boxShadow: '0 12px 50px rgba(0,0,0,.6), 0 0 30px rgba(249,115,22,.15)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            className="flex justify-between items-center px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(249,115,22,.2)' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-bold"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #c084fc)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                }}
              >
                Уведомления
              </span>
              {unread > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ border: '1px solid rgba(212,175,55,.5)', color: '#FFD700' }}>
                  новых: {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-gray-400 hover:text-white transition-colors">
                Прочитать все
              </button>
            )}
          </div>

          <div className="overflow-y-auto" style={{ flex: 1 }}>
            {items.length === 0 && (
              <p className="text-center text-xs text-gray-500 py-10">
                Пока тихо — уведомления появятся здесь
              </p>
            )}
            {items.map(n => {
              const type = inferType(n)
              return (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className="w-full text-left flex gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                  style={{
                    borderBottom: '1px solid rgba(249,115,22,.08)',
                    background: n.is_read ? 'transparent' : 'rgba(212,175,55,.05)',
                  }}
                >
                  <TypeIcon type={type} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-relaxed ${n.is_read ? 'text-gray-400' : 'text-white'}`}>
                      {n.message}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <span className="flex-shrink-0 mt-1.5"
                      style={{ width: 7, height: 7, borderRadius: '50%', background: '#FFD700', boxShadow: '0 0 8px rgba(255,215,0,.9)' }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
