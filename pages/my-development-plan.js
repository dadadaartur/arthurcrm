import { useEffect, useState } from 'react'
import BackArrow from '../components/BackArrow'
import LoadingScreen from '../components/LoadingScreen'
import { supabase } from '../lib/supabaseClient'

const TYPE_META = {
  task: { color: '#ea580c', label: 'Задание' },
  training: { color: '#0e7490', label: 'Тренинг' },
  test: { color: '#7c3aed', label: 'Тест' },
}
const STATUS_META = {
  pending: { color: '#ea580c', label: 'В процессе' },
  completed: { color: '#137a39', label: 'Выполнено' },
  overdue: { color: '#dc2626', label: 'Просрочено' },
  cancelled: { color: 'var(--text-muted)', label: 'Отменено' },
}

export default function MyDevelopmentPlan() {
  const [loading, setLoading] = useState(true)
  const [actions, setActions] = useState([])
  const [testResults, setTestResults] = useState([])
  const [trainingResults, setTrainingResults] = useState([])

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/my-development-plan', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (r.ok) { const d = await r.json(); setActions(d.actions || []); setTestResults(d.testResults || []); setTrainingResults(d.trainingResults || []) }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <LoadingScreen />

  const today = new Date().toISOString().slice(0, 10)
  const withComputedStatus = actions.map(a => ({ ...a, computedStatus: a.status === 'pending' && a.deadline && a.deadline < today ? 'overdue' : a.status }))
  const pending = withComputedStatus.filter(a => a.computedStatus === 'pending')
  const overdue = withComputedStatus.filter(a => a.computedStatus === 'overdue')
  const done = withComputedStatus.filter(a => a.computedStatus === 'completed')
  const passedTests = testResults.filter(t => t.is_passed).length

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
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <BackArrow href="/goals" title="Мой план развития" />
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 640 }}>
          Всё, что назначено руководителем — задания, тренинги, тесты — плюс результаты пройденного, на одной странице.
        </p>

        {actions.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>Пока ничего не назначено</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }}>
            {overdue.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>Просрочено ({overdue.length})</div>
                {overdue.map(a => <Row key={a.id} a={a} />)}
              </div>
            )}
            {pending.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#ea580c', marginBottom: 10 }}>В процессе ({pending.length})</div>
                {pending.map(a => <Row key={a.id} a={a} />)}
              </div>
            )}
            {done.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#137a39', marginBottom: 10 }}>Выполнено ({done.length})</div>
                {done.map(a => <Row key={a.id} a={a} />)}
              </div>
            )}
          </div>
        )}

        {(testResults.length > 0 || trainingResults.length > 0) && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Результаты обучения</h2>
              {testResults.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>тестов сдано {passedTests} из {testResults.length}</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {testResults.map(t => (
                <div key={t.id} style={{ padding: 14, borderRadius: 12, background: 'var(--bg-card)', border: `1px solid ${t.is_passed ? 'rgba(19,122,57,0.3)' : 'rgba(220,38,38,0.3)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>Тест #{t.test_id}</span>
                    <span style={{ color: t.is_passed ? '#137a39' : '#dc2626', fontWeight: 700 }}>{t.score}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
                    <span>{new Date(t.completed_at).toLocaleDateString('ru')}</span>
                    <span>{t.is_passed ? 'сдан' : 'не сдан'}</span>
                  </div>
                </div>
              ))}
              {trainingResults.map(v => (
                <div key={v.id} style={{ padding: 14, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid rgba(19,122,57,0.25)' }}>
                  <div style={{ color: '#137a39', fontSize: 13, fontWeight: 500 }}>Тренинг просмотрен</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{new Date(v.created_at).toLocaleDateString('ru')}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
