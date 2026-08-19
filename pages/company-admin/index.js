import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import { withAuth } from '../../components/withAuth'

const CARDS = [
  { key: 'goals',      title: 'Управление целями',       sub: 'KPI, пороги, тренинги, типы расчёта',  href: '/company-admin/mastery',    color: '#FFD700', accent: '#c084fc', primary: true },
  { key: 'tasks',      title: 'Управление заданиями',    sub: 'Создание, назначение, награды',        href: '/company-admin/tasks',      color: '#c084fc', accent: '#a0e9ff', primary: true },
  { key: 'employees',  title: 'Команда',                 sub: 'Сотрудники, должности, доступы',       href: '/company-admin/employees',  color: '#a0e9ff', accent: '#FFD700', primary: true },
  { key: 'review',     title: 'Задания на проверке',     sub: 'Одобрение и отклонение',               href: '/company-admin/review',     color: '#ffb3c6', accent: '#FFD700', badge: 'pendingReviews' },
  { key: 'history',    title: 'История заданий',         sub: 'Выполненные и отклонённые',            href: '/company-admin/history',    color: '#e2e8f0', accent: '#a0e9ff' },
  { key: 'rewards',    title: 'Товары',                  sub: 'Витрина магазина наград',              href: '/company-admin/rewards',    color: '#4ade80', accent: '#FFD700' },
  { key: 'purchases',  title: 'Покупки сотрудников',     sub: 'Согласование и выдача',                href: '/company-admin/purchases',  color: '#fda4af', accent: '#c084fc', badge: 'pendingPurchases' },
  { key: 'goalsPer',   title: 'Глобальные цели',         sub: 'Стратегические цели компании',         href: '/company-admin/goals',      color: '#FFD700', accent: '#ffb3c6' },
  { key: 'results',    title: 'Результаты команды',      sub: 'Аналитика и динамика',                 href: '/company-admin/results',    color: '#a0e9ff', accent: '#4ade80' },
  { key: 'levels',     title: 'Уровни прогресса',        sub: 'Архитектура роста сотрудников',        href: '/company-admin/progress',   color: '#c084fc', accent: '#ffb3c6' },
  { key: 'resources',  title: 'Ресурсы',                 sub: 'Фонд, тариф, пополнение',              href: '/company-admin/resources',  color: '#FFD700', accent: '#a0e9ff' },
  { key: 'adapt',      title: 'Адаптация',               sub: 'Планы онбординга новичков',            href: '/company-admin/adaptation', color: '#86efac', accent: '#a0e9ff', badge: 'activeAdaptations' },
]

function StatTile({ label, value, color, delay }) {
  return (
    <div style={{
      position: 'relative',
      padding: '22px 26px',
      borderRadius: 18,
      background: 'linear-gradient(145deg, rgba(20,25,45,0.85), rgba(10,15,30,0.95))',
      backdropFilter: 'blur(14px)',
      border: `1px solid ${color}33`,
      overflow: 'hidden',
      opacity: 0,
      transform: 'translateY(10px)',
      animation: `fadeUp 0.7s ${delay}s ease-out forwards`,
    }}>
      <div style={{
        position: 'absolute', top: -30, right: -30, width: 90, height: 90,
        background: `radial-gradient(circle, ${color}22, transparent 70%)`,
        filter: 'blur(18px)', pointerEvents: 'none'
      }} />
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color, lineHeight: 1, textShadow: `0 0 20px ${color}66` }}>{value}</div>
    </div>
  )
}

function NavCard({ c, stats, delay, router }) {
  const badgeVal = c.badge ? (stats[c.badge] || 0) : 0
  return (
    <div
      onClick={() => router.push(c.href)}
      className="nav-card"
      style={{
        '--card-color': c.color,
        '--card-accent': c.accent,
        position: 'relative',
        padding: c.primary ? 28 : 22,
        borderRadius: 20,
        background: c.primary
          ? 'linear-gradient(145deg, rgba(25,30,55,0.9), rgba(15,20,40,0.95))'
          : 'rgba(15,20,35,0.75)',
        backdropFilter: 'blur(14px)',
        border: `1px solid ${c.color}22`,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.35s, box-shadow 0.35s',
        gridColumn: c.primary ? 'span 1' : 'span 1',
        minHeight: c.primary ? 180 : 140,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        opacity: 0,
        transform: 'translateY(12px)',
        animation: `fadeUp 0.7s ${delay}s ease-out forwards`,
      }}
    >
      {/* Декоративный блик */}
      <div className="nav-card-glow" style={{
        position: 'absolute', top: -40, right: -40, width: 160, height: 160,
        background: `radial-gradient(circle, ${c.color}28, transparent 65%)`,
        filter: 'blur(24px)', pointerEvents: 'none',
        transition: 'transform 0.5s ease',
      }} />
      <div className="nav-card-stripe" style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: `linear-gradient(180deg, ${c.color}, ${c.accent})`,
        borderRadius: '3px 0 0 3px',
      }} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{
            fontSize: c.primary ? 20 : 16,
            fontWeight: 600,
            color: '#fff',
            letterSpacing: 0.2,
          }}>{c.title}</div>
          {badgeVal > 0 && (
            <div style={{
              minWidth: 26, height: 22, padding: '0 8px',
              borderRadius: 11,
              background: `linear-gradient(135deg, ${c.color}, ${c.accent})`,
              color: '#0a0f1e',
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 12px ${c.color}88`,
              animation: 'softPulse 2.4s ease-in-out infinite',
            }}>{badgeVal}</div>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, fontWeight: 400 }}>{c.sub}</div>
      </div>

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <span className="nav-card-action" style={{
          fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
          color: c.color, fontWeight: 600,
          transition: 'letter-spacing 0.35s',
        }}>Открыть</span>
        <span style={{
          display: 'inline-block',
          width: 14, height: 1,
          background: c.color,
          transition: 'width 0.35s, transform 0.35s',
        }} className="nav-card-arrow" />
      </div>

      <style jsx>{`
        .nav-card:hover {
          transform: translateY(-4px);
          border-color: ${c.color}88;
          box-shadow: 0 14px 40px ${c.color}22, 0 0 0 1px ${c.color}44 inset;
        }
        .nav-card:hover .nav-card-glow { transform: scale(1.4) translate(-10px, 10px); }
        .nav-card:hover .nav-card-action { letter-spacing: 2.5px; }
        .nav-card:hover .nav-card-arrow { width: 24px; transform: translateX(4px); }
      `}</style>
    </div>
  )
}

function CompanyAdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    tasks: 0, employees: 0, goals: 0,
    pendingReviews: 0, pendingPurchases: 0, activeAdaptations: 0
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (!profile) { router.push('/'); return }
      const cid = profile.company_id

      const [tR, eR, gR] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('company_id', cid).eq('is_active', true),
        supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('company_id', cid).is('deleted_at', null).eq('is_company_admin', false),
        supabase.from('goals').select('id', { count: 'exact', head: true }).eq('company_id', cid).eq('is_active', true)
      ])

      const { data: tasks } = await supabase.from('tasks').select('id').eq('company_id', cid)
      const taskIds = (tasks || []).map(t => t.id)
      let pr = 0
      if (taskIds.length) {
        const { count } = await supabase.from('task_assignments').select('id', { count: 'exact', head: true }).in('task_id', taskIds).eq('status', 'pending_review')
        pr = count || 0
      }

      const { data: emps } = await supabase.from('profiles').select('user_id').eq('company_id', cid).is('deleted_at', null)
      const uids = (emps || []).map(e => e.user_id)
      let pp = 0
      if (uids.length) {
        const { count } = await supabase.from('purchases').select('id', { count: 'exact', head: true }).in('user_id', uids).in('status', ['pending', 'new'])
        pp = count || 0
      }

      let aa = 0
      try {
        const { count } = await supabase.from('adaptation_plans').select('id', { count: 'exact', head: true }).eq('company_id', cid).eq('status', 'active')
        aa = count || 0
      } catch {}

      setStats({
        tasks: tR.count || 0,
        employees: eR.count || 0,
        goals: gR.count || 0,
        pendingReviews: pr,
        pendingPurchases: pp,
        activeAdaptations: aa,
      })
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}>
      <Spinner />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '48px 40px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>

        {/* Заголовок */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10, fontWeight: 500 }}>Панель руководителя</div>
          <h1 style={{
            fontSize: 40, fontWeight: 700, margin: 0, letterSpacing: -0.5,
            background: 'linear-gradient(135deg, #fff 0%, #a0e9ff 45%, #FFD700 85%, #ffb3c6 100%)',
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'titleShift 12s ease-in-out infinite alternate',
          }}>Управление компанией</h1>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8, maxWidth: 700, lineHeight: 1.5 }}>
            Ключевые инструменты руководителя. Всё в одном месте — от целей и заданий до команды и магазина наград.
          </div>
        </div>

        {/* Stat-блоки */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 36,
        }}>
          <StatTile label="Активных заданий"  value={stats.tasks}            color="#c084fc" delay={0.05} />
          <StatTile label="Сотрудников"       value={stats.employees}        color="#a0e9ff" delay={0.12} />
          <StatTile label="Целей в работе"    value={stats.goals}            color="#FFD700" delay={0.19} />
          <StatTile label="На проверке"       value={stats.pendingReviews}   color="#ffb3c6" delay={0.26} />
        </div>

        {/* Ключевые блоки — крупные, в первой строке */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 18,
          marginBottom: 18,
        }}>
          {CARDS.filter(c => c.primary).map((c, i) => (
            <NavCard key={c.key} c={c} stats={stats} router={router} delay={0.3 + i * 0.08} />
          ))}
        </div>

        {/* Остальные блоки */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
        }}>
          {CARDS.filter(c => !c.primary).map((c, i) => (
            <NavCard key={c.key} c={c} stats={stats} router={router} delay={0.55 + i * 0.05} />
          ))}
        </div>

        {/* Подвал-подсказка */}
        <div style={{
          marginTop: 40, padding: '18px 24px',
          borderRadius: 16,
          background: 'linear-gradient(90deg, rgba(255,215,0,0.05), rgba(192,132,252,0.05), rgba(160,233,255,0.05))',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            Бейджи на карточках показывают количество ожидающих действий. Все операции логируются и попадают в уведомления сотрудников.
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>v2.1 · enterprise</div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes titleShift {
          0%   { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        @keyframes softPulse {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 10px var(--card-color, #FFD700)88; }
          50%      { transform: scale(1.08); box-shadow: 0 0 18px var(--card-color, #FFD700)cc; }
        }
      `}</style>
    </div>
  )
}

export default withAuth(CompanyAdminDashboard, { anyStaff: true })
