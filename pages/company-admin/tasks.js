import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import { resolveThresholds } from '../../lib/kpi'
import BackArrow from '../../components/BackArrow'
import DatePicker from '../../components/DatePicker'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const ghostBtn = {
  background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12,
  padding: '10px 22px', color: '#fff', cursor: 'pointer', fontSize: 13, transition: 'all .25s'
}
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }
const pillTab = a => ({
  padding: '8px 18px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
  background: a ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
  border: `1px solid ${a ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`,
  color: a ? '#FFD700' : '#aaa', fontWeight: a ? 700 : 400, transition: 'all 0.2s'
})
const AUTO_LABELS = {
  all_min: 'Выполнить ВСЕ цели за день не ниже «мин»',
  all_mid: 'Выполнить ВСЕ цели за день не ниже «средн»',
  any_one: 'Выполнить хотя бы одну цель за день',
}
const Seg = ({ active, onClick, children, color = '#FFD700' }) => (
  <button type="button" onClick={onClick} style={{ padding: '6px 14px', borderRadius: 12, fontSize: 11, cursor: 'pointer', fontWeight: active ? 600 : 400, background: active ? `linear-gradient(135deg, ${color}26, ${color}10)` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? color + '88' : 'rgba(255,255,255,0.1)'}`, color: active ? color : '#999', transition: 'all 0.2s ease' }}>{children}</button>
)

function TasksPage() {
  const router = useRouter()
  const { showSuccess, showError } = useFeedback()
  const [companyId, setCompanyId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [archived, setArchived] = useState([])
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('create')
  const [restoreId, setRestoreId] = useState(null)
  const [restoreDate, setRestoreDate] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', reward_karma: 10,
    task_type: 'one_time', frequency: 'once', target_role: 'all',
    requires_review: true, requires_proof: false, proof_type: 'any',
    deadline_date: '', is_auto_goal: false, auto_goal_condition: 'all_min', auto_energy: 5,
    auto_mode: 'general', auto_metric_id: '', auto_target_rank: 1,
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
      supabase.from('kpi_metrics').select('*').eq('company_id', cid).eq('is_active', true).order('name')
    ])
    setTasks(a.data || [])
    setArchived(b.data || [])
    setMetrics(m.data || [])
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { showError('Укажите название задания'); return }
    if (!form.reward_karma || form.reward_karma <= 0) { showError('Укажите награду больше 0'); return }
    if (form.is_auto_goal && form.auto_mode === 'specific' && !form.auto_metric_id) { showError('Выберите показатель для точного авто-задания'); return }
    setCreating(true)
    let imageUrl = null
    if (form.image_file) {
      const ext = form.image_file.name.split('.').pop()
      const path = `public/task-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, form.image_file)
      if (!upErr) imageUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }
    const deadlineAt = form.deadline_date ? new Date(form.deadline_date + 'T23:59:59').toISOString() : null
    const { data: task, error } = await supabase.from('tasks').insert({
      company_id: companyId, title: form.title, description: form.description,
      reward_karma: form.reward_karma, task_type: form.is_auto_goal ? 'auto_goal' : form.task_type,
      frequency: form.frequency, target_role: form.target_role,
      requires_review: form.is_auto_goal ? false : form.requires_review,
      requires_proof: form.requires_proof, proof_type: form.requires_proof ? form.proof_type : null,
      deadline_at: deadlineAt, is_active: true,
      is_auto_goal: form.is_auto_goal, auto_goal_condition: form.is_auto_goal && form.auto_mode === 'general' ? form.auto_goal_condition : null,
      auto_energy: form.is_auto_goal ? form.auto_energy : 0,
      auto_metric_id: form.is_auto_goal && form.auto_mode === 'specific' && form.auto_metric_id ? form.auto_metric_id : null,
      auto_target_rank: form.is_auto_goal && form.auto_mode === 'specific' ? form.auto_target_rank : null,
      image_url: imageUrl
    }).select().single()
    if (error) { showError('Ошибка создания: ' + error.message); setCreating(false); return }

    const { data: emps } = await supabase.from('profiles').select('user_id')
      .eq('company_id', companyId).eq('is_company_admin', false).is('deleted_at', null)
    if (emps?.length) {
      const { error: asErr } = await supabase.from('task_assignments').insert(
        emps.map(emp => ({ task_id: task.id, user_id: emp.user_id, status: 'assigned', deadline_at: deadlineAt }))
      )
      if (asErr) { showError('Ошибка назначения: ' + asErr.message); setCreating(false); return }
      showSuccess(`Задание создано и назначено ${emps.length} сотрудникам`)
    } else {
      showSuccess('Задание создано')
    }
    setForm({ ...form, title: '', description: '', image_file: null, deadline_date: '' })
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

  if (loading) return <LoadingScreen />

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление заданиями" extra={
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#888', alignSelf: 'center' }}>Активных: <b style={{ color: '#FFD700' }}>{tasks.length}</b></div>
        } />

        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          <button onClick={() => { setForm(f => ({ ...f, is_auto_goal: false })); setTab('create') }} style={pillTab(tab === 'create')}>Обычное задание</button>
          <button onClick={() => { setForm(f => ({ ...f, is_auto_goal: true, auto_mode: 'specific' })); setTab('create-goal') }} style={pillTab(tab === 'create-goal')}>По цели</button>
          <button onClick={() => { setForm(f => ({ ...f, is_auto_goal: true, auto_mode: 'specific' })); setTab('create-external') }} style={pillTab(tab === 'create-external')}>С внешней автопроверкой</button>
          <button onClick={() => setTab('active')} style={pillTab(tab === 'active')}>Активные</button>
          <button onClick={() => setTab('archived')} style={pillTab(tab === 'archived')}>Архив · {archived.length}</button>
        </div>

        {(tab === 'create-goal' || tab === 'create-external') && (() => {
          const isExternal = tab === 'create-external'
          const relevantMetrics = isExternal ? metrics.filter(m => m.source === 'auto') : metrics
          return (
          <div style={{ background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)', borderRadius: 20, padding: 32, border: `1px solid ${isExternal ? 'rgba(74,222,128,0.3)' : 'rgba(192,132,252,0.3)'}` }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: '#fff' }}>{isExternal ? 'Задание с внешней автопроверкой' : 'Задание по цели'}</h3>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>
              {isExternal
                ? 'Показатель сам подтягивает значение из внешней системы (CRM, отчёт и т.п.) по расписанию — без ручного ввода. Настройка источника — в «Управлении целями», раздел «Источник значений».'
                : 'Система сама проверяет, достиг ли сотрудник нужного уровня по показателю (введённому вручную или автоматически), и начисляет награду — без ручной проверки.'}
            </p>
            {isExternal && relevantMetrics.length === 0 && (
              <div style={{ padding: 14, borderRadius: 12, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: 12, marginBottom: 16 }}>
                Ни у одного показателя не включён внешний источник. Откройте «Управление целями» → выберите или создайте показатель → «Источник значений» → «Авто (внешний источник)», затем вернитесь сюда.
              </div>
            )}
            {!isExternal && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <Seg active={form.auto_mode === 'general'} onClick={() => setForm({ ...form, auto_mode: 'general' })} color="#c084fc">По всем целям</Seg>
                <Seg active={form.auto_mode === 'specific'} onClick={() => setForm({ ...form, auto_mode: 'specific' })} color="#c084fc">По одной цели</Seg>
              </div>
            )}
            <form onSubmit={handleCreateTask}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Название</label>
                  <input className="input-field" style={{ width: '100%' }} placeholder="Например: Звонки на уровень Ультра" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Награда (кармики)</label>
                  <input type="number" className="input-field" style={{ width: '100%' }} min="1" value={form.reward_karma} onChange={e => setForm({ ...form, reward_karma: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Дедлайн</label>
                  <DatePicker value={form.deadline_date} onChange={v => setForm({ ...form, deadline_date: v })} placeholder="Без дедлайна" />
                </div>
              </div>

              {!isExternal && form.auto_mode === 'general' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 20 }}>
                  <select className="input-field" style={{ width: '100%' }} value={form.auto_goal_condition} onChange={e => setForm({ ...form, auto_goal_condition: e.target.value })}>
                    {Object.entries(AUTO_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                  <div>
                    <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Энергия</label>
                    <input type="number" className="input-field" style={{ width: '100%' }} value={form.auto_energy} onChange={e => setForm({ ...form, auto_energy: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.7fr', gap: 12, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Показатель{isExternal ? ' (с внешним источником)' : ''}</label>
                    <select className="input-field" style={{ width: '100%' }} value={form.auto_metric_id} onChange={e => setForm({ ...form, auto_metric_id: e.target.value, auto_target_rank: 1 })}>
                      <option value="">Выберите показатель…</option>
                      {relevantMetrics.map(m => <option key={m.id} value={m.id}>{m.name}{m.source === 'auto' ? ' · авто-источник' : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Уровень (не ниже)</label>
                    <select className="input-field" style={{ width: '100%' }} value={form.auto_target_rank} onChange={e => setForm({ ...form, auto_target_rank: parseInt(e.target.value) })} disabled={!form.auto_metric_id}>
                      {form.auto_metric_id && resolveThresholds(metrics.find(m => m.id === form.auto_metric_id) || {}).map((t, i) => (
                        <option key={t.key} value={i + 1}>{t.label} ({t.value}{metrics.find(m => m.id === form.auto_metric_id)?.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Энергия</label>
                    <input type="number" className="input-field" style={{ width: '100%' }} value={form.auto_energy} onChange={e => setForm({ ...form, auto_energy: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              )}
              <button type="submit" className="btn-gold">Создать задание</button>
            </form>
          </div>
          )
        })()}

        {tab === 'create' && (
          <div style={{ background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)', borderRadius: 20, padding: 32, border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: '#fff' }}>Создать задание</h3>
            <form onSubmit={handleCreateTask}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
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
                  {t.is_auto_goal
                    ? (t.auto_metric_id
                        ? `Авто: «${metrics.find(m => m.id === t.auto_metric_id)?.name || '?'}» — уровень ${t.auto_target_rank || 1}+`
                        : `Авто: ${AUTO_LABELS[t.auto_goal_condition] || t.auto_goal_condition}`)
                    : (t.description?.slice(0, 70) || 'Без описания')}
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
