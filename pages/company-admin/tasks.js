import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import DatePicker from '../../components/DatePicker'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const ghostBtn = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,215,0,0.3)',
  borderRadius: 12,
  padding: '10px 22px',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 13,
  transition: 'all .25s'
}
const hoverOn = e => {
  e.currentTarget.style.borderColor = '#FFD700'
  e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)'
  e.currentTarget.style.transform = 'translateY(-1px)'
}
const hoverOff = e => {
  e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'
  e.currentTarget.style.boxShadow = 'none'
  e.currentTarget.style.transform = 'translateY(0)'
}
const pillTab = a => ({
  padding: '8px 18px',
  borderRadius: 20,
  fontSize: 12,
  cursor: 'pointer',
  background: a ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
  border: `1px solid ${a ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`,
  color: a ? '#FFD700' : '#aaa',
  fontWeight: a ? 700 : 400,
  transition: 'all 0.2s'
})
const AUTO_LABELS = {
  all_min: 'Выполнить ВСЕ цели за день не ниже «мин»',
  all_mid: 'Выполнить ВСЕ цели за день не ниже «средн»',
  any_one: 'Выполнить хотя бы одну цель за день',
}

function TasksPage() {
  const router = useRouter()
  const { showSuccess, showError } = useFeedback()
  const [companyId, setCompanyId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [archived, setArchived] = useState([])
  const [metrics, setMetrics] = useState([]) // <-- список KPI
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('create')
  const [restoreId, setRestoreId] = useState(null)
  const [restoreDate, setRestoreDate] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    reward_karma: 10,
    task_type: 'one_time',
    frequency: 'once',
    target_role: 'all',
    requires_review: true,
    requires_proof: false,
    proof_type: 'any',
    deadline_date: '',
    is_auto_goal: false,
    auto_goal_condition: 'all_min',
    auto_metric_id: '',   // <-- новая метрика
    auto_required_band: '', // <-- новый уровень (min/mid/top/ultra)
    auto_energy: 5,
    image_file: null
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (!p) { router.push('/'); return }
      setCompanyId(p.company_id)
      await loadData(p.company_id)
      setLoading(false)
    }
    init()
  }, [router])

  const loadData = async (cid) => {
    const [a, b, m] = await Promise.all([
      supabase.from('tasks').select('*').eq('company_id', cid).eq('is_active', true).eq('is_archived', false).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('company_id', cid).eq('is_archived', true).order('archived_at', { ascending: false }),
      supabase.from('kpi_metrics').select('id, name').eq('company_id', cid).eq('is_active', true)
    ])
    setTasks(a.data || [])
    setArchived(b.data || [])
    setMetrics(m.data || [])
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { showError('Укажите название задания'); return }
    if (!form.reward_karma || form.reward_karma <= 0) { showError('Укажите награду больше 0'); return }

    // Проверка для авто-задания с конкретной метрикой
    if (form.is_auto_goal && form.auto_metric_id && !form.auto_required_band) {
      showError('Укажите требуемый уровень для авто-задания')
      return
    }
    if (form.is_auto_goal && !form.auto_metric_id && !form.auto_goal_condition) {
      showError('Выберите условие для авто-задания')
      return
    }

    setCreating(true)
    let imageUrl = null
    if (form.image_file) {
      const ext = form.image_file.name.split('.').pop()
      const path = `public/task-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, form.image_file)
      if (!upErr) imageUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }
    const deadlineAt = form.deadline_date ? new Date(form.deadline_date + 'T23:59:59').toISOString() : null

    // Определяем поля авто-зачёта
    let autoFields = {}
    if (form.is_auto_goal) {
      if (form.auto_metric_id) {
        // Новый тип: привязка к конкретной метрике и уровню
        autoFields = {
          is_auto_goal: true,
          auto_metric_id: form.auto_metric_id,
          auto_required_band: form.auto_required_band,
          auto_goal_condition: null, // не используется
          auto_energy: form.auto_energy
        }
      } else {
        // Старый тип: общее условие по всем метрикам
        autoFields = {
          is_auto_goal: true,
          auto_metric_id: null,
          auto_required_band: null,
          auto_goal_condition: form.auto_goal_condition,
          auto_energy: form.auto_energy
        }
      }
    }

    const { data: task, error } = await supabase.from('tasks').insert({
      company_id: companyId,
      title: form.title,
      description: form.description,
      reward_karma: form.reward_karma,
      task_type: form.is_auto_goal ? 'auto_goal' : form.task_type,
      frequency: form.frequency,
      target_role: form.target_role,
      requires_review: form.is_auto_goal ? false : form.requires_review,
      requires_proof: form.requires_proof,
      proof_type: form.requires_proof ? form.proof_type : null,
      deadline_at: deadlineAt,
      is_active: true,
      image_url: imageUrl,
      ...autoFields
    }).select().single()

    if (error) {
      showError('Ошибка создания: ' + error.message)
      setCreating(false)
      return
    }

    // Если это не авто-задание, назначаем сотрудникам
    if (!form.is_auto_goal) {
      const { data: emps } = await supabase.from('profiles').select('user_id')
        .eq('company_id', companyId).eq('is_company_admin', false).is('deleted_at', null)
      if (emps?.length) {
        const { error: asErr } = await supabase.from('task_assignments').insert(
          emps.map(emp => ({ task_id: task.id, user_id: emp.user_id, status: 'assigned', deadline_at: deadlineAt }))
        )
        if (asErr) {
          showError('Ошибка назначения: ' + asErr.message)
          setCreating(false)
          return
        }
        showSuccess(`Задание создано и назначено ${emps.length} сотрудникам`)
      } else {
        showSuccess('Задание создано')
      }
    } else {
      // Авто-задание – сотрудникам не назначается, система сама проверит
      showSuccess('Авто-задание создано, система будет проверять достижения')
    }

    setForm({
      title: '',
      description: '',
      reward_karma: 10,
      task_type: 'one_time',
      frequency: 'once',
      target_role: 'all',
      requires_review: true,
      requires_proof: false,
      proof_type: 'any',
      deadline_date: '',
      is_auto_goal: false,
      auto_goal_condition: 'all_min',
      auto_metric_id: '',
      auto_required_band: '',
      auto_energy: 5,
      image_file: null
    })
    setCreating(false)
    loadData(companyId)
  }

  const handleDelete = async (id) => {
    await supabase.from('tasks').update({ is_active: false }).eq('id', id)
    showSuccess('Задание удалено')
    loadData(companyId)
  }

  const handleRestore = async (taskId) => {
    if (!restoreDate) { showError('Выберите новый срок выполнения'); return }
    const newDeadline = new Date(restoreDate + 'T23:59:59').toISOString()
    await supabase.from('tasks').update({ is_archived: false, archived_at: null, deadline_at: newDeadline }).eq('id', taskId)
    await supabase.from('task_assignments').update({ status: 'assigned', deadline_at: newDeadline, deadline_reminded_at: null })
      .eq('task_id', taskId).eq('status', 'archived')
    showSuccess('Задание восстановлено с новым сроком')
    setRestoreId(null); setRestoreDate('')
    loadData(companyId)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление заданиями" extra={
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#888', alignSelf: 'center' }}>Активных: <b style={{ color: '#FFD700' }}>{tasks.length}</b></div>
        } />

        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          <button onClick={() => setTab('create')} style={pillTab(tab === 'create')}>Новое задание</button>
          <button onClick={() => setTab('active')} style={pillTab(tab === 'active')}>Активные</button>
          <button onClick={() => setTab('archived')} style={pillTab(tab === 'archived')}>Архив · {archived.length}</button>
        </div>

        {tab === 'create' && (
          <div style={{ background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)', borderRadius: 20, padding: 32, border: '1px solid rgba(255,255,255,0.08)', maxWidth: 980 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: '#fff' }}>Создать задание</h3>
            <form onSubmit={handleCreateTask}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Название</label>
                  <input className="input-field" style={{ width: '100%' }} placeholder="Например: 30 звонков за смену" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Награда (кармики)</label>
                  <input type="number" className="input-field" style={{ width: '100%' }} min="1" value={form.reward_karma} onChange={e => setForm({ ...form, reward_karma: parseInt(e.target.value) || 0 })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Описание</label>
                  <textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Дедлайн (фирменный календарь)</label>
                  <DatePicker value={form.deadline_date} onChange={v => setForm({ ...form, deadline_date: v })} placeholder="Без дедлайна" />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Для кого</label>
                  <select className="input-field" style={{ width: '100%' }} value={form.target_role} onChange={e => setForm({ ...form, target_role: e.target.value })}>
                    <option value="all">Все сотрудники</option>
                    <option value="new">Новые (&lt; 1 мес.)</option>
                    <option value="experienced">Опытные (&gt; 1 мес.)</option>
                  </select>
                </div>

                {/* Авто-зачёт по целям */}
                <div style={{ gridColumn: 'span 2', padding: 16, borderRadius: 14, background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.25)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#c084fc', cursor: 'pointer', marginBottom: 10 }}>
                    <input type="checkbox" checked={form.is_auto_goal} onChange={e => setForm({ ...form, is_auto_goal: e.target.checked })} style={{ accentColor: '#c084fc' }} />
                    Авто-зачёт по целям (система проверяет сама)
                  </label>
                  {form.is_auto_goal && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Привязать к конкретной цели</label>
                        <select className="input-field" style={{ width: '100%' }} value={form.auto_metric_id || ''} onChange={e => setForm({ ...form, auto_metric_id: e.target.value })}>
                          <option value="">— Все цели (общее условие) —</option>
                          {metrics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>
                          {form.auto_metric_id ? 'Требуемый уровень для этой цели' : 'Условие для всех целей'}
                        </label>
                        {form.auto_metric_id ? (
                          <select className="input-field" style={{ width: '100%' }} value={form.auto_required_band || ''} onChange={e => setForm({ ...form, auto_required_band: e.target.value })}>
                            <option value="">Выберите уровень</option>
                            <option value="min">Минимум</option>
                            <option value="mid">Средний</option>
                            <option value="top">Топ</option>
                            <option value="ultra">Ультра</option>
                          </select>
                        ) : (
                          <select className="input-field" style={{ width: '100%' }} value={form.auto_goal_condition} onChange={e => setForm({ ...form, auto_goal_condition: e.target.value })}>
                            {Object.entries(AUTO_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                          </select>
                        )}
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Энергия за выполнение</label>
                        <input type="number" className="input-field" style={{ width: '100%' }} value={form.auto_energy} onChange={e => setForm({ ...form, auto_energy: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ccc', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.requires_review} onChange={e => setForm({ ...form, requires_review: e.target.checked })} style={{ accentColor: '#FFD700' }} />
                    Требуется проверка
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ccc', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.requires_proof} onChange={e => setForm({ ...form, requires_proof: e.target.checked })} style={{ accentColor: '#FFD700' }} />
                    Медиа-подтверждение
                  </label>
                  {form.requires_proof && (
                    <select className="input-field" value={form.proof_type} onChange={e => setForm({ ...form, proof_type: e.target.value })}>
                      <option value="any">Фото или видео</option><option value="photo">Только фото</option><option value="video">Только видео</option>
                    </select>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button type="submit" disabled={creating} style={{ ...ghostBtn, opacity: creating ? 0.5 : 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                  {creating ? 'Создаём...' : 'Создать задание'}
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === 'active' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {tasks.length === 0 && <div style={{ gridColumn: '1 / -1', background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777' }}>Нет активных заданий</div>}
            {tasks.map(t => (
              <div key={t.id} style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 16, padding: 18, border: '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.25s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,215,0,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{t.title}</div>
                  <span style={{ color: '#FFD700', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>+{t.reward_karma}</span>
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
                  {t.is_auto_goal ? (
                    t.auto_metric_id ? (
                      `Авто: цель «${metrics.find(m => m.id === t.auto_metric_id)?.name || t.auto_metric_id}» ≥ ${t.auto_required_band}`
                    ) : (
                      `Авто: ${AUTO_LABELS[t.auto_goal_condition] || t.auto_goal_condition}`
                    )
                  ) : (
                    t.description?.slice(0, 70) || 'Без описания'
                  )}
                </div>
                {t.deadline_at && <div style={{ fontSize: 11, color: '#a0e9ff', marginTop: 6 }}>Дедлайн: {new Date(t.deadline_at).toLocaleDateString('ru')}</div>}
                <div style={{ marginTop: 12 }}>
                  <button onClick={() => handleDelete(t.id)} style={{ background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 8, padding: '5px 14px', color: '#f87171', fontSize: 11, cursor: 'pointer' }}>Удалить</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'archived' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {archived.length === 0 && <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777' }}>Архив пуст</div>}
            {archived.map(t => (
              <div key={t.id} style={{ background: 'rgba(15,20,35,0.7)', borderRadius: 14, padding: 16, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#ccc', fontWeight: 500 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>В архиве с {t.archived_at ? new Date(t.archived_at).toLocaleDateString('ru') : '—'} · срок истёк</div>
                </div>
                {restoreId === t.id ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ width: 180 }}><DatePicker value={restoreDate} onChange={setRestoreDate} placeholder="Новый срок" /></div>
                    <button onClick={() => handleRestore(t.id)} style={{ ...ghostBtn, padding: '8px 16px', fontSize: 12 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Восстановить</button>
                  </div>
                ) : (
                  <button onClick={() => { setRestoreId(t.id); setRestoreDate('') }} style={{ ...ghostBtn, padding: '8px 16px', fontSize: 12 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Восстановить</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
export default withAuth(TasksPage, { permission: 'can_create_tasks' })
