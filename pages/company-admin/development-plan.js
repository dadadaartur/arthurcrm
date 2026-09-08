import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import BackArrow from '../../components/BackArrow'
import LoadingScreen from '../../components/LoadingScreen'
import { supabase } from '../../lib/supabaseClient'
import { withAuth } from '../../components/withAuth'

const TYPE_META = {
  task: { color: '#8a6208', label: 'Задание' },
  training: { color: '#0e7490', label: 'Тренинг' },
  test: { color: '#7c3aed', label: 'Тест' },
}
const STATUS_META = {
  pending: { color: '#8a6208', label: 'В процессе' },
  completed: { color: '#137a39', label: 'Выполнено' },
  overdue: { color: '#dc2626', label: 'Просрочено' },
  cancelled: { color: 'var(--text-muted)', label: 'Отменено' },
}

function DevelopmentPlan() {
  const router = useRouter()
  const { userId, name } = router.query
  const [loading, setLoading] = useState(true)
  const [actions, setActions] = useState([])

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(`/api/company-admin/development/assign?userId=${userId}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (r.ok) setActions((await r.json()).actions || [])
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) return <LoadingScreen />

  // Просроченные считаем на лету по дедлайну — статус в базе мог не
  // успеть обновиться отдельным cron-проходом, а на странице должно
  // быть видно честно и сразу.
  const today = new Date().toISOString().slice(0, 10)
  const withComputedStatus = actions.map(a => ({ ...a, computedStatus: a.status === 'pending' && a.deadline && a.deadline < today ? 'overdue' : a.status }))
  const pending = withComputedStatus.filter(a => a.computedStatus === 'pending')
  const overdue = withComputedStatus.filter(a => a.computedStatus === 'overdue')
  const done = withComputedStatus.filter(a => a.computedStatus === 'completed')

  const Row = ({ a }) => {
    const t = TYPE_META[a.action_type] || { color: 'var(--text-muted)', label: a.action_type }
    const s = STATUS_META[a.computedStatus] || STATUS_META.pending
    return (
      <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: t.color + '18', color: t.color }}>{t.label}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{a.title}</span>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: s.color }}>{s.label}</span>
        </div>
        {a.reason && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>{a.reason}</p>}
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Назначено {new Date(a.created_at).toLocaleDateString('ru')}
          {a.deadline && ` · срок до ${new Date(a.deadline).toLocaleDateString('ru')}`}
        </div>
      </div>
    )
  }

  return (
    <div className="theme-light" style={{ minHeight: '100vh', padding: '40px 32px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <BackArrow href="/company-admin/analytics" title={`План развития — ${name || ''}`} />
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
          Все действия, назначенные этому сотруднику — задания, тренинги, тесты — на одной странице, с причиной и дедлайном.
        </p>

        {actions.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>Пока ничего не назначено</div>
        ) : (
          <>
            {overdue.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>Просрочено ({overdue.length})</div>
                {overdue.map(a => <Row key={a.id} a={a} />)}
              </div>
            )}
            {pending.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#8a6208', marginBottom: 10 }}>В процессе ({pending.length})</div>
                {pending.map(a => <Row key={a.id} a={a} />)}
              </div>
            )}
            {done.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#137a39', marginBottom: 10 }}>Выполнено ({done.length})</div>
                {done.map(a => <Row key={a.id} a={a} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
export default withAuth(DevelopmentPlan, { permission: 'can_review_tasks' })
