import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import { withAuth } from '../../components/withAuth'
import { getPlural, formatDuration } from '../../lib/format'

const TASK_TYPE_LABELS = { one_time: 'Разовые', recurring: 'Регулярные', auto_crm: 'Авто из CRM' }
const REWARD_TYPE_LABELS = { digital: 'Сертификаты', workplace: 'Рабочее место', delivery: 'Доставка домой', promocode: 'Промокоды' }

function CompanyAdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [d, setD] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single()
      if (!profile) { router.push('/'); return }
      await loadAll(profile.company_id)
      setLoading(false)
    }
    init()
  }, [])

  const loadAll = async (compId) => {
    const [tasksRes, employeesRes, rewardsRes] = await Promise.all([
      supabase.from('tasks').select('id, task_type').eq('company_id', compId).eq('is_active', true),
      supabase.from('profiles').select('user_id').eq('company_id', compId).is('deleted_at', null).eq('is_company_admin', false),
      supabase.from('rewards').select('id, type').eq('company_id', compId)
    ])
    const tasks = tasksRes.data || []
    const employees = employeesRes.data || []
    const rewards = rewardsRes.data || []
    const taskIds = tasks.map(t => t.id)
    const userIds = employees.map(e => e.user_id)

    const [assignmentsRes, purchasesRes] = await Promise.all([
      taskIds.length
        ? supabase.from('task_assignments').select('status, started_at, completed_at').in('task_id', taskIds).limit(2000)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? supabase.from('purchases').select('status').in('user_id', userIds).limit(2000)
        : Promise.resolve({ data: [] })
    ])
    const assignments = assignmentsRes.data || []
    const purchases = purchasesRes.data || []

    const completedList = assignments.filter(a => a.status === 'completed')
    const durations = completedList
      .filter(a => a.started_at && a.completed_at)
      .map(a => new Date(a.completed_at) - new Date(a.started_at))
      .filter(x => x > 0)

    const tasksByType = {}
    tasks.forEach(t => { const k = t.task_type || 'one_time'; tasksByType[k] = (tasksByType[k] || 0) + 1 })
    const rewardsByType = {}
    rewards.forEach(r => { const k = r.type || 'digital'; rewardsByType[k] = (rewardsByType[k] || 0) + 1 })
    const purchasesByStatus = {}
    purchases.forEach(p => { purchasesByStatus[p.status] = (purchasesByStatus[p.status] || 0) + 1 })

    setD({
      tasksCount: tasks.length,
      employeesCount: employees.length,
      rewardsCount: rewards.length,
      pendingReviews: assignments.filter(a => a.status === 'pending_review').length,
      pendingCerts: purchasesByStatus['pending'] || 0,
      completed: completedList.length,
      rejected: assignments.filter(a => a.status === 'rejected').length,
      inProgress: assignments.filter(a => a.status === 'in_progress').length,
      avgMs: durations.length ? durations.reduce((s, x) => s + x, 0) / durations.length : null,
      minMs: durations.length ? Math.min(...durations) : null,
      maxMs: durations.length ? Math.max(...durations) : null,
      tasksByType,
      rewardsByType,
      purchasesByStatus
    })
  }

  if (loading || !d) {
    return <div className="flex justify-center items-center py-24"><Spinner text="Загружаем аналитику…" /></div>
  }

  const NavBtn = ({ href, children, badge }) => (
    <Link href={href} className="btn-glass relative" style={{ textDecoration: 'none', display: 'inline-block' }}>
      {children}
      {badge > 0 && (
        <span className="absolute flex items-center justify-center font-bold"
          style={{
            top: -8, right: -8, minWidth: 20, height: 20, padding: '0 5px',
            borderRadius: 9999, fontSize: 11, color: '#0a1628',
            background: 'linear-gradient(135deg, #FFD700, #f97316)',
            boxShadow: '0 0 10px rgba(255,215,0,.7)'
          }}>
          {badge}
        </span>
      )}
    </Link>
  )

  const StatCard = ({ value, label, href, badge }) => (
    <button
      onClick={() => router.push(href)}
      className="text-center transition-all hover:-translate-y-1"
      style={{
        background: 'rgba(15,20,35,0.8)', backdropFilter: 'blur(10px)',
        borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.1)',
        position: 'relative', cursor: 'pointer'
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 700, color: '#FFD700' }}>{value}</div>
      <div style={{ fontSize: 14, color: '#aaa', marginTop: 4 }}>{label}</div>
      {badge > 0 && (
        <span className="absolute flex items-center justify-center font-bold"
          style={{
            top: 8, right: 8, minWidth: 22, height: 22, padding: '0 6px',
            borderRadius: 9999, fontSize: 12, color: '#0a1628',
            background: 'linear-gradient(135deg, #FFD700, #f97316)',
            boxShadow: '0 0 10px rgba(255,215,0,.7)'
          }}>
          {badge}
        </span>
      )}
    </button>
  )

  const AnalyticsCard = ({ title, children }) => (
    <div className="premium-card" style={{ padding: 24 }}>
      <h3 className="text-sm font-bold mb-3" style={{
        background: 'linear-gradient(135deg, #f97316, #c084fc)',
        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'
      }}>{title}</h3>
      {children}
    </div>
  )

  const Row = ({ label, value, color }) => (
    <div className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid rgba(249,115,22,.1)' }}>
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-semibold" style={{ color: color || '#FFD700' }}>{value}</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 20px', position: 'relative' }}>
      {/* Звёзды */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        {Array.from({ length: 80 }).map((_, i) => {
          const size = Math.random() * 2 + 0.5
          const colors = ['#ffffff', '#ffe0d0', '#ffddaa', '#d0e0ff', '#ffffdd', '#ffe4c4']
          const color = colors[Math.floor(Math.random() * colors.length)]
          return (
            <div key={i} style={{
              position: 'absolute', left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
              width: size + 'px', height: size + 'px', borderRadius: '50%', background: color,
              boxShadow: `0 0 ${size * 2}px ${color}`,
              opacity: Math.random() * 0.5 + 0.3,
              animation: `twinkle ${Math.random() * 10 + 5}s ease-in-out infinite`,
              animationDelay: Math.random() * 10 + 's'
            }} />
          )
        })}
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: 28, fontWeight: 600, marginBottom: 24,
          background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>Панель управления</h1>

        {/* Навигация — консервативные стеклянные кнопки */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
          <NavBtn href="/company-admin/tasks">Управление заданиями</NavBtn>
          <NavBtn href="/company-admin/employees">Управление командой</NavBtn>
          <NavBtn href="/company-admin/rewards">Управление товарами</NavBtn>
          <NavBtn href="/company-admin/review" badge={d.pendingReviews}>Задания на проверке</NavBtn>
          <NavBtn href="/company-admin/purchases" badge={d.pendingCerts}>Подтверждение сертификатов</NavBtn>
          <NavBtn href="/company-admin/history">История заданий</NavBtn>
          <NavBtn href="/company-admin/goals">Цели</NavBtn>
        </div>

        {/* Кликабельные карточки-счётчики */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
          <StatCard value={d.tasksCount} label={getPlural(d.tasksCount, ['активное задание', 'активных задания', 'активных заданий'])} href="/company-admin/tasks" />
          <StatCard value={d.employeesCount} label={getPlural(d.employeesCount, ['сотрудник', 'сотрудника', 'сотрудников'])} href="/company-admin/employees" />
          <StatCard value={d.rewardsCount} label={getPlural(d.rewardsCount, ['товар в магазине', 'товара в магазине', 'товаров в магазине'])} href="/company-admin/rewards" />
          <StatCard value={d.pendingReviews} label={getPlural(d.pendingReviews, ['задание на проверке', 'задания на проверке', 'заданий на проверке'])} href="/company-admin/review" badge={d.pendingReviews} />
          <StatCard value={d.pendingCerts} label={getPlural(d.pendingCerts, ['сертификат на подтверждении', 'сертификата на подтверждении', 'сертификатов на подтверждении'])} href="/company-admin/purchases" badge={d.pendingCerts} />
          <StatCard value={d.completed} label={getPlural(d.completed, ['задание выполнено', 'задания выполнено', 'заданий выполнено'])} href="/company-admin/history" />
        </div>

        {/* Аналитика */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <AnalyticsCard title="Время выполнения заданий">
            <Row label="Среднее время" value={d.avgMs ? formatDuration(d.avgMs) : '—'} />
            <Row label="Самое быстрое" value={d.minMs ? formatDuration(d.minMs) : '—'} color="#4ade80" />
            <Row label="Самое долгое" value={d.maxMs ? formatDuration(d.maxMs) : '—'} color="#f87171" />
            <Row label="Сейчас в работе" value={`${d.inProgress} ${getPlural(d.inProgress, ['задание', 'задания', 'заданий'])}`} color="#c084fc" />
            <Row label="Отклонено" value={`${d.rejected} ${getPlural(d.rejected, ['задание', 'задания', 'заданий'])}`} color="#f87171" />
          </AnalyticsCard>

          <AnalyticsCard title="Задания по типам">
            {Object.keys(d.tasksByType).length === 0 && <p className="text-sm text-gray-500">Активных заданий нет</p>}
            {Object.entries(d.tasksByType).map(([k, v]) => (
              <Row key={k} label={TASK_TYPE_LABELS[k] || k} value={`${v} ${getPlural(v, ['задание', 'задания', 'заданий'])}`} />
            ))}
          </AnalyticsCard>

          <AnalyticsCard title="Покупки по статусам">
            <Row label="Одобрено" value={`${d.purchasesByStatus['approved'] || 0}`} color="#4ade80" />
            <Row label="На подтверждении" value={`${d.purchasesByStatus['pending'] || 0}`} color="#FFD700" />
            <Row label="Не активировано" value={`${d.purchasesByStatus['new'] || 0}`} color="#a0e9ff" />
            <Row label="Отклонено" value={`${d.purchasesByStatus['rejected'] || 0}`} color="#f87171" />
          </AnalyticsCard>

          <AnalyticsCard title="Товары по категориям">
            {Object.keys(d.rewardsByType).length === 0 && <p className="text-sm text-gray-500">Товаров пока нет</p>}
            {Object.entries(d.rewardsByType).map(([k, v]) => (
              <Row key={k} label={REWARD_TYPE_LABELS[k] || k} value={`${v} ${getPlural(v, ['товар', 'товара', 'товаров'])}`} />
            ))}
          </AnalyticsCard>
        </div>
      </div>

      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}

export default withAuth(CompanyAdminDashboard, { anyStaff: true })
