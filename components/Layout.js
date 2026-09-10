import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { useProfile } from '../context/ProfileContext'
import { isSuperAdmin as checkIsSuperAdmin, isCompanyAdmin as checkIsCompanyAdmin } from '../lib/permissions'

// Шапка и подвал переведены на светлую тему как постоянные, общие для
// всего сайта элементы (не через обёртку .theme-light конкретной
// страницы — шапка не является потомком какой-то одной страницы, а
// значит на неё не действует то же самое каскадное правило). Из-за
// этого первое время шапка будет светлой поверх ещё не переделанных
// тёмных страниц — временная нестыковка на период, пока не переведён
// весь остальной проект, не баг.
function NotificationBell() {
  const { user } = useProfile()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [pos, setPos] = useState({ top: 50, right: 20 })
  const btnRef = useRef(null)
  const boxRef = useRef(null)
  const load = async () => {
    if (!user) return
    const { data } = await supabase.from('notifications').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
    setItems(data || [])
    setUnread((data || []).filter(n => !n.is_read).length)
  }
  useEffect(() => {
    if (!user) return
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [user])
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (boxRef.current && boxRef.current.contains(e.target)) return
      if (btnRef.current && btnRef.current.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  const markAll = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setUnread(0)
    setItems(p => p.map(n => ({ ...n, is_read: true })))
  }
  const clickItem = async (n) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
      setUnread(u => Math.max(0, u - 1))
      setItems(p => p.map(x => x.id === n.id ? { ...x, is_read: true } : x))
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }
  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 10, right: Math.max(10, window.innerWidth - rect.right) })
    }
    setOpen(o => !o)
  }
  return (
    <>
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <button ref={btnRef} onClick={toggle}
          style={{ position: 'relative', cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(234,88,12,0.14), rgba(124,58,237,0.12), rgba(14,116,144,0.12))', border: `1px solid ${open ? 'var(--border-gold)' : 'rgba(15,23,42,0.12)'}`, transition: 'all 0.3s ease', boxShadow: open ? '0 0 0 3px rgba(234,88,12,0.12)' : 'none' }}>
          <span className="bell-shimmer" />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="url(#bellGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'relative' }}>
            <defs>
              <linearGradient id="bellGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ea580c" /><stop offset="55%" stopColor="#dc2626" /><stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
        {/* Бейдж вынесен из кнопки — overflow:hidden у неё (нужен для
            блика) обрезал цифру, она жила за пределами круга кнопки
            (по фидбеку от 6 сентября 2026: «цифра почти не видна»). */}
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 9999, background: 'linear-gradient(135deg, #dc2626, #ea580c)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px #fff', zIndex: 2 }}>{unread}</span>
        )}
      </div>
      <style jsx global>{`
        @keyframes bellShimmerMove { 0% { transform: translateX(-120%) rotate(15deg); } 100% { transform: translateX(220%) rotate(15deg); } }
        .bell-shimmer { position: absolute; top: -40%; left: 0; width: 35%; height: 180%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); animation: bellShimmerMove 4s ease-in-out infinite; pointer-events: none; }
      `}</style>
      {open && createPortal(
        <div ref={boxRef} style={{ position: 'fixed', top: pos.top, right: pos.right, width: 330, maxHeight: 420, overflowY: 'auto', zIndex: 99999, padding: 14, background: '#ffffff', border: '1px solid rgba(15,23,42,0.09)', borderRadius: 16, boxShadow: '0 16px 40px rgba(15,23,42,0.16)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>Уведомления</span>
            {items.length > 0 && (
              <button onClick={markAll} style={{ fontSize: 11, color: '#5f6b80', background: 'none', border: 'none', cursor: 'pointer' }}>Прочитать все</button>
            )}
          </div>
          {items.length === 0 ? (
            <p style={{ fontSize: 13, color: '#5f6b80', textAlign: 'center', padding: '18px 0' }}>Пока нет уведомлений</p>
          ) : (
            items.map(n => (
              <div key={n.id} onClick={() => clickItem(n)}
                style={{ padding: 10, borderRadius: 10, cursor: 'pointer', marginBottom: 6, background: n.is_read ? '#f8f9fb' : 'rgba(234,88,12,0.07)', borderLeft: n.is_read ? '2px solid transparent' : '2px solid #ea580c' }}>
                <p style={{ fontSize: 13, color: '#161b28', margin: 0 }}>{n.message}</p>
                <p style={{ fontSize: 11, color: '#5f6b80', margin: '4px 0 0' }}>{new Date(n.created_at).toLocaleString('ru')}</p>
              </div>
            ))
          )}
        </div>,
        document.body
      )}
    </>
  )
}

const navPill = { flex: '0 0 auto', fontSize: 12, fontWeight: 500, background: '#fff', border: '1px solid rgba(15,23,42,0.09)', borderRadius: 50, padding: '8px 16px', color: '#5b6478', textDecoration: 'none', transition: 'all 0.2s', whiteSpace: 'nowrap' }

export default function Layout({ children, autoHideHeader = false }) {
  const { user, profile, loading } = useProfile()
  const [companyName, setCompanyName] = useState('')
  const [companyLogo, setCompanyLogo] = useState('')
  const [isPlatformStaff, setIsPlatformStaff] = useState(false)
  const [headerRevealed, setHeaderRevealed] = useState(false)
  useEffect(() => {
    if (user) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return
        fetch('/api/platform-admin/me', { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then(r => r.json())
          .then(d => setIsPlatformStaff(!!d.isPlatformStaff))
          .catch(() => {})
      })
    }
    if (profile?.company_id && !companyName) {
      supabase.from('companies').select('name, logo_url').eq('id', profile.company_id).single()
        .then(({ data: comp }) => { if (comp) { setCompanyName(comp.name); setCompanyLogo(comp.logo_url || '') } })
    }
  }, [user, profile])
  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }
  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-page)' }}>
        <header className="flex justify-between items-center px-6 py-3 relative z-10" style={{ background: '#fff', borderBottom: '1px solid rgba(15,23,42,0.07)' }}>
          <div className="flex items-center gap-4">
            <div className="h-6 w-32 rounded-full animate-pulse" style={{ background: 'rgba(15,23,42,0.06)' }}> </div>
          </div>
        </header>
        <main className="flex-grow relative z-10">{children}</main>
      </div>
    )
  }
  const isSuperAdmin = checkIsSuperAdmin(profile)
  const isCompanyAdmin = checkIsCompanyAdmin(profile) || isSuperAdmin
  const companyStatus = profile?.companies?.status
  const isBlockedByModeration = !isSuperAdmin && !isPlatformStaff
    && companyStatus && ['suspended', 'rejected'].includes(companyStatus)
  const isPendingModeration = !isSuperAdmin && !isPlatformStaff && companyStatus === 'pending'
  if (isBlockedByModeration) {
    return (
      <div className="theme-light min-h-screen flex items-center justify-center px-4">
        <div className="premium-card max-w-md text-center">
          <h1 className="text-xl font-bold mb-3" style={{ color: 'var(--accent-red)' }}>
            {companyStatus === 'suspended' ? 'Компания заблокирована' : 'Заявка компании отклонена'}
          </h1>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
            {profile.companies.status_reason || 'Обратитесь в поддержку Кармического банка для уточнения деталей.'}
          </p>
          <button onClick={handleLogout} className="btn-outline text-sm px-4 py-2">Выйти</button>
        </div>
      </div>
    )
  }
  if (isPendingModeration) {
    return (
      <div className="theme-light min-h-screen flex items-center justify-center px-4">
        <div className="premium-card max-w-md text-center">
          <h1 className="text-xl font-bold mb-3" style={{ color: 'var(--accent-gold)' }}>Заявка на модерации</h1>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
            Компания «{profile.companies.name}» создана и ожидает проверки администратором Кармического банка.
            Обычно это занимает немного времени — как только заявку одобрят, здесь появится полный доступ.
          </p>
          <button onClick={handleLogout} className="btn-outline text-sm px-4 py-2">Выйти</button>
        </div>
      </div>
    )
  }
  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return (profile.first_name[0] + profile.last_name[0]).toUpperCase()
    }
    if (profile?.display_name) return profile.display_name.substring(0, 2).toUpperCase()
    return user?.email?.substring(0, 2).toUpperCase() || '?'
  }
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-page)' }}>
      {autoHideHeader ? (
        <>
        <div
          onMouseEnter={() => setHeaderRevealed(true)}
          onMouseLeave={() => setHeaderRevealed(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 80, zIndex: 50 }}
        >
          {/* Шапка скрыта полностью (translateY -100%, без остатка) —
              раньше край в 14px оставался виден всегда, это и была
              жалоба «панель слегка видна». Один родитель с наведением
              вместо трёх конкурирующих слоёв — источник прошлого
              дребезга. */}
          <header className="flex justify-between items-center px-6 py-3" style={{
            background: '#fff', borderBottom: '1px solid rgba(15,23,42,0.07)',
            position: 'absolute', top: 0, left: 0, right: 0,
            transform: headerRevealed ? 'translateY(0)' : 'translateY(-100%)',
            transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1)',
            boxShadow: headerRevealed ? '0 10px 34px rgba(15,23,42,0.14)' : 'none',
          }}>
            <div className="flex items-center gap-3 flex-wrap">
              <Link href="/" className="text-base font-bold" style={{ background: 'linear-gradient(135deg, #ea580c, #0e7490, #7c3aed)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
                Кармический банк
              </Link>
              <nav className="flex gap-2 flex-wrap">
                <Link href="/goals" style={navPill}>Мои цели</Link>
                <Link href="/my-development-plan" style={navPill}>План развития</Link>
                {isSuperAdmin && <Link href="/admin" style={navPill}>Админ</Link>}
                {isSuperAdmin && <Link href="/central-bank" style={navPill}>Центробанк</Link>}
                {isPlatformStaff && <Link href="/platform-admin" style={navPill}>Модерация площадки</Link>}
                {isCompanyAdmin && <Link href="/company-admin" style={navPill}>Управление</Link>}
                {isCompanyAdmin && <Link href="/company-admin/results" style={navPill}>Результаты</Link>}
              </nav>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium" style={{ paddingRight: 52 }}>
              {companyName && (
                <Link href="/company" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                  {companyLogo && <img src={companyLogo} alt="" style={{ width: 18, height: 18, borderRadius: 5, objectFit: 'cover' }} />}
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{companyName}</span>
                </Link>
              )}
              <Link href="/profile" className="flex items-center gap-2 transition-colors" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'rgba(234,88,12,0.12)', color: 'var(--accent-gold)' }}>
                    {getInitials()}
                  </div>
                )}
                <span style={{ fontSize: 12 }}>{profile?.display_name || user.email}</span>
              </Link>
              <button onClick={handleLogout} style={navPill}>Выйти</button>
            </div>
          </header>

          {/* Молния — уникальный премиальный крючок-подсказка вместо
              обычной стрелки (по прямому запросу от 2 сентября 2026).
              Тонкий геометричный контур, золотой градиент, мягкое
              свечение, лёгкое дыхание — не мультяшная иконка. Гаснет,
              когда шапка раскрыта, ей нечего подсказывать в этот момент. */}
          <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', opacity: headerRevealed ? 0 : 1, transition: 'opacity 0.3s ease' }}>
            <div className="bolt-halo" />
            <svg width="20" height="30" viewBox="0 0 64 90" style={{ animation: 'boltBreathe 2.8s ease-in-out infinite', filter: 'drop-shadow(0 0 7px rgba(220,90,20,0.6))', position: 'relative' }}>
              <defs>
                <linearGradient id="layoutBoltGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fff3d6" />
                  <stop offset="40%" stopColor="#f0a020" />
                  <stop offset="75%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              <path d="M40 0 L14 42 L34 42 L26 78 L64 30 L42 30 L52 0 Z" fill="url(#layoutBoltGrad)" />
            </svg>
          </div>
        </div>
        {/* Колокольчик отдельно от скрывающейся шапки — раньше жил
            внутри неё и пропадал вместе с ней почти всё время (по
            фидбеку от 6 сентября 2026 — на главной, где проводят
            больше всего времени, уведомления были практически
            недоступны). Теперь виден всегда, независимо от состояния
            шапки. */}
        <div style={{ position: 'fixed', top: 16, right: 20, zIndex: 60 }}>
          <NotificationBell />
        </div>
        </>
      ) : (
        <header className="flex justify-between items-center px-6 py-3 relative z-10" style={{ background: '#fff', borderBottom: '1px solid rgba(15,23,42,0.07)' }}>
          <div className="flex items-center gap-3 flex-wrap">
          <Link href="/" className="text-base font-bold" style={{ background: 'linear-gradient(135deg, #ea580c, #0e7490, #7c3aed)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
            Кармический банк
          </Link>
          <nav className="flex gap-2 flex-wrap">
            <Link href="/goals" style={navPill}>Мои цели</Link>
            <Link href="/my-development-plan" style={navPill}>План развития</Link>
            {isSuperAdmin && <Link href="/admin" style={navPill}>Админ</Link>}
            {isSuperAdmin && <Link href="/central-bank" style={navPill}>Центробанк</Link>}
            {isPlatformStaff && <Link href="/platform-admin" style={navPill}>Модерация площадки</Link>}
            {isCompanyAdmin && <Link href="/company-admin" style={navPill}>Управление</Link>}
            {isCompanyAdmin && <Link href="/company-admin/results" style={navPill}>Результаты</Link>}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          {companyName && (
            <Link href="/company" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              {companyLogo && <img src={companyLogo} alt="" style={{ width: 18, height: 18, borderRadius: 5, objectFit: 'cover' }} />}
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{companyName}</span>
            </Link>
          )}
          <NotificationBell />
          <Link href="/profile" className="flex items-center gap-2 transition-colors" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'rgba(234,88,12,0.12)', color: 'var(--accent-gold)' }}>
                {getInitials()}
              </div>
            )}
            <span style={{ fontSize: 12 }}>{profile?.display_name || user.email}</span>
          </Link>
          <button onClick={handleLogout} style={navPill}>Выйти</button>
        </div>
      </header>
      )}
      <style jsx global>{`
        @keyframes boltBreathe { 0%, 100% { opacity: 0.75; transform: scale(0.94); } 50% { opacity: 1; transform: scale(1.04); } }
        .bolt-halo { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); width: 34px; height: 34px; border-radius: 50%; background: radial-gradient(circle, rgba(240,160,32,0.35), transparent 70%); animation: boltHaloPulse 2.8s ease-in-out infinite; }
        @keyframes boltHaloPulse { 0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(0.9); } 50% { opacity: 0.9; transform: translateX(-50%) scale(1.15); } }
      `}</style>
      <main className="flex-grow relative z-10">{children}</main>
      <footer className="text-center py-4 text-xs relative z-10" style={{ color: 'var(--text-muted)' }}>
        © {new Date().getFullYear()} Кармический банк
      </footer>
    </div>
  )
}
