import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useProfile } from '../context/ProfileContext'
import { isSuperAdmin as checkIsSuperAdmin, isCompanyAdmin as checkIsCompanyAdmin } from '../lib/permissions'

export default function Layout({ children }) {
  const { user, profile, loading } = useProfile()
  const [companyName, setCompanyName] = useState('')
  const [crmUrl, setCrmUrl] = useState('#')
  const [isPlatformStaff, setIsPlatformStaff] = useState(false)

  useEffect(() => {
    if (user) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return
        fetch('/api/platform-admin/me', { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then(r => r.json())
          .then(d => setIsPlatformStaff(!!d.isPlatformStaff))
          .catch(() => {})
      })

      // Раньше здесь access_token/refresh_token клались прямо в query-string
      // ссылки на внешний домен — они утекали в историю браузера, логи
      // прокси и Referer сторонних ресурсов. refresh_token — это фактически
      // бессрочный ключ от аккаунта, поэтому такая ссылка была равносильна
      // возможности полного захвата аккаунта для любого, кто её увидит.
      //
      // Теперь получаем одноразовый короткоживущий код через защищённый
      // серверный эндпоинт и передаём в URL только его — сами токены в
      // адресную строку больше не попадают. См. pages/api/crm-handoff/*.js.
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session?.access_token || !session?.refresh_token) return
        try {
          const res = await fetch('/api/crm-handoff/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              accessToken: session.access_token,
              refreshToken: session.refresh_token
            })
          })
          if (!res.ok) return
          const { code } = await res.json()
          setCrmUrl(`https://summercrm-git-main-dadadaarturs-projects.vercel.app/?handoff=${encodeURIComponent(code)}`)
        } catch (e) {
          // Тихо не показываем кнопку рабочей, если обмен не удался —
          // лучше нерабочая ссылка, чем утечка токена.
        }
      })
    }
    if (profile?.company_id && !companyName) {
      supabase.from('companies').select('name').eq('id', profile.company_id).single()
        .then(({ data: comp }) => {
          if (comp) setCompanyName(comp.name)
        })
    }
  }, [user, profile])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // Скелетон на время загрузки профиля
  if (loading || !user) {
    return (
      <div className="lumen-shell min-h-screen flex flex-col">
        <header className="flex justify-between items-center px-6 py-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-6 w-32 rounded-full animate-pulse" style={{ background: 'var(--lumen-line)' }}></div>
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-full animate-pulse" style={{ background: 'var(--lumen-line)' }}></div>
              <div className="h-6 w-16 rounded-full animate-pulse" style={{ background: 'var(--lumen-line)' }}></div>
              <div className="h-6 w-14 rounded-full animate-pulse" style={{ background: 'var(--lumen-line)' }}></div>
              <div className="h-6 w-14 rounded-full animate-pulse" style={{ background: 'var(--lumen-line)' }}></div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-6 w-20 rounded-full animate-pulse" style={{ background: 'var(--lumen-line)' }}></div>
            <div className="h-6 w-6 rounded-full animate-pulse" style={{ background: 'var(--lumen-line)' }}></div>
            <div className="h-6 w-12 rounded-full animate-pulse" style={{ background: 'var(--lumen-line)' }}></div>
          </div>
        </header>
        <main className="flex-grow relative z-10">{children}</main>
      </div>
    )
  }

  // ВАЖНО: role_id уникален для каждой компании (roles.company_id) и не
  // является переносимой константой — раньше здесь было захардкожено
  // `roleId === 2` для админа компании, что могло случайно давать/забирать
  // доступ не тем людям в зависимости от того, как были заведены роли в
  // конкретной компании. Используем те же хелперы, что и everywhere else
  // в проекте (lib/permissions.js): is_company_admin флаг и role_id=1 +
  // company_id=null для супер-админа.
  const isSuperAdmin = checkIsSuperAdmin(profile)
  const isCompanyAdmin = checkIsCompanyAdmin(profile) || isSuperAdmin

  // Реальное принудительное действие для кнопки "Заблокировать"/"Отклонить"
  // в кабинете модератора площадки (pages/platform-admin/index.js) — до
  // этой правки статус компании менялся в БД, но нигде не проверялся, то
  // есть заблокированная компания продолжала работать как ни в чём не
  // бывало. Супер-админ и платформенный стафф не блокируются — им нужно
  // видеть интерфейс, чтобы разобраться в ситуации.
  //
  // ВАЖНО: это ограничение на уровне UI/UX (не пускает пользователя дальше
  // в интерфейсе). Оно НЕ заменяет RLS на уровне БД — данные компании
  // технически всё ещё доступны через прямые вызовы к Supabase REST API
  // теми же ключами. Полноценное принудительное отключение на уровне БД
  // (добавление проверки company.status во все относящиеся policy —
  // deals/tasks/chat_sessions/purchases и т.д.) — это отдельная более
  // крупная миграция; см. заметку в конце ответа.
  const companyStatus = profile?.companies?.status
  const isBlockedByModeration = !isSuperAdmin && !isPlatformStaff
    && companyStatus && ['suspended', 'rejected'].includes(companyStatus)
  const isPendingModeration = !isSuperAdmin && !isPlatformStaff && companyStatus === 'pending'

  if (isBlockedByModeration) {
    return (
      <div className="lumen-shell min-h-screen flex items-center justify-center px-4">
        <div className="premium-card max-w-md text-center">
          <h1 className="text-xl font-semibold mb-3" style={{ color: 'var(--lumen-red)', fontFamily: 'var(--lumen-font-display)' }}>
            {companyStatus === 'suspended' ? 'Компания заблокирована' : 'Заявка компании отклонена'}
          </h1>
          <p className="mb-5" style={{ color: 'var(--lumen-ink-soft)' }}>
            {profile.companies.status_reason || 'Обратитесь в поддержку Кармического банка для уточнения деталей.'}
          </p>
          <button onClick={handleLogout} className="btn-lumen-outline text-sm">Выйти</button>
        </div>
      </div>
    )
  }

  // Компания создана самостоятельно (create-company.js) и ждёт проверки
  // супер-админом (platform-admin/set-company-status.js). До перевода в
  // 'active' сотрудники этой компании не должны видеть рабочий интерфейс —
  // иначе смысл модерации теряется. Супер-админ/платформенный стафф видят
  // интерфейс как обычно (им нужно попасть в platform-admin, чтобы одобрить).
  if (isPendingModeration) {
    return (
      <div className="lumen-shell min-h-screen flex items-center justify-center px-4">
        <div className="premium-card max-w-md text-center">
          <h1 className="text-xl font-semibold mb-3" style={{ color: 'var(--lumen-gold-strong)', fontFamily: 'var(--lumen-font-display)' }}>Заявка на модерации</h1>
          <p className="mb-5" style={{ color: 'var(--lumen-ink-soft)' }}>
            Компания «{profile.companies.name}» создана и ожидает проверки администратором Кармического банка.
            Обычно это занимает немного времени — как только заявку одобрят, здесь появится полный доступ.
          </p>
          <button onClick={handleLogout} className="btn-lumen-outline text-sm">Выйти</button>
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
    <div className="lumen-shell min-h-screen flex flex-col">
      <header
        className="flex justify-between items-center px-6 py-3 relative z-10"
        style={{ borderBottom: '1px solid var(--lumen-line)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0 }}
      >
        <div className="flex items-center gap-5">
          <Link
            href="/"
            className="text-base font-semibold"
            style={{ fontFamily: 'var(--lumen-font-display)', color: 'var(--lumen-ink)' }}
          >
            Кармический банк
          </Link>
          <div className="lumen-hairline" style={{ width: 1, height: 20, background: 'var(--lumen-line)', animation: 'none', opacity: 1 }} />
          <nav className="flex gap-2 text-xs font-medium flex-wrap">
            <Link href="/path-to-perfection" className="action-btn !py-1.5 !px-4 !text-xs">Путь к совершенству</Link>
            <Link href="/healthcare" className="action-btn !py-1.5 !px-4 !text-xs">Забота о здоровье</Link>
            <a href={crmUrl} target="_blank" rel="noopener noreferrer" className="action-btn !py-1.5 !px-4 !text-xs">
              CRM Лето
            </a>
            {isSuperAdmin && <Link href="/admin" className="action-btn !py-1.5 !px-4 !text-xs">Админ</Link>}
            {isPlatformStaff && (
              <Link href="/platform-admin" className="action-btn !py-1.5 !px-4 !text-xs">Модерация площадки</Link>
            )}
            {isCompanyAdmin && (
              <Link href="/company-admin" className="action-btn !py-1.5 !px-4 !text-xs">Управление</Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          {companyName && <span style={{ color: 'var(--lumen-ink-faint)' }}>{companyName}</span>}
          <Link href="/profile" className="flex items-center gap-2 transition-colors" style={{ color: 'var(--lumen-ink)' }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" style={{ border: '1px solid var(--lumen-line)' }} />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ background: 'var(--lumen-surface-2)', border: '1px solid var(--lumen-line)', color: 'var(--lumen-ink-soft)' }}
              >
                {getInitials()}
              </div>
            )}
            <span>{profile?.display_name || user.email}</span>
          </Link>
          <button onClick={handleLogout} className="action-btn !py-1.5 !px-4 !text-xs">Выйти</button>
        </div>
      </header>

      <main className="flex-grow relative z-10">{children}</main>

      <footer className="text-center py-5 text-xs relative z-10" style={{ color: 'var(--lumen-ink-faint)' }}>
        © {new Date().getFullYear()} Кармический банк
      </footer>
    </div>
  )
}
