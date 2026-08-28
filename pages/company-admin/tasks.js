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
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [myScope, setMyScope] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('create')
  const [restoreId, setRestoreId] = useState(null)
  const [restoreDate, setRestoreDate] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', reward_karma: 10,
    task_type: 'one_time', frequency: 'once', target_role: 'all',
    requires_review: true, requires_proof: false, proof_type: 'any',
    deadline_date: '', is_auto_goal: false, auto_goal_condition: 'all_min', auto_energy: 1,
    auto_mode: 'general', auto_metric_id: '', auto_target_rank: 1,
    department_id: '', specific_user_ids: [], image_file: null
  })
  const [creating, setCreating] = useState(false)
  const [pendingReviews, setPendingReviews] = useState([])
  const [reviewHistory, setReviewHistory] = useState([])
  const [selectedReview, setSelectedReview] = useState(null)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)

  useEffect(() => {
    if (router.query.tab && ['create', 'create-goal', 'create-external', 'review', 'active', 'archived'].includes(router.query.tab)) {
      setTab(router.query.tab)
    }
  }, [router.query.tab])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (!p) { router.push('/'); return }
      setCompanyId(p.company_id)
      const { data: { session } } = await supabase.auth.getSession()
      const dr = await fetch('/api/company-admin/departments', { headers: { Authorization: `Bearer ${session.access_token}` } })
      let scope = null
      if (dr.ok) { const dd = await dr.json(); setDepartments(dd.departments || []); setEmployees(dd.employees || []); setMyScope(dd.scope); scope = dd.scope }
      await loadData(p.company_id, scope)
      setLoading(false)
    }
    init()
  }, [router])

  // Изоляция команд (миграция 013) — руководитель отдела видит на этой
  // странице только задания своей зоны (свой отдел + все вложенные) и
  // общие для всей компании, не всё подряд.
  const loadData = async (cid, scope) => {
    const [a, b, m] = await Promise.all([
      supabase.from('tasks').select('*').eq('company_id', cid).eq('is_active', true).eq('is_archived', false).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('company_id', cid).eq('is_archived', true).order('archived_at', { ascending: false }),
      supabase.from('kpi_metrics').select('*').eq('company_id', cid).eq('is_active', true).order('name')
    ])
    const scopeToUse = scope !== undefined ? scope : myScope
    const inScope = t => scopeToUse === null || !t.department_id || scopeToUse.includes(t.department_id)
    const scopedTasks = (a.data || []).filter(inScope)
    const scopedArchived = (b.data || []).filter(inScope)
    setTasks(scopedTasks)
    setArchived(scopedArchived)
    setMetrics(m.data || [])
    await loadReviews(cid, [...scopedTasks, ...scopedArchived])
  }

  // Проверка заданий — раньше жила отдельной страницей review.js без
  // единого понятия зоны ответственности (видела все задания компании
  // целиком, руководитель отдела видел бы чужие команды). Теперь
  // переиспользует тот же список задач, что уже отфильтрован по зоне.
  const loadReviews = async (cid, scopedTaskList) => {
    const taskMap = Object.fromEntries(scopedTaskList.map(t => [t.id, t]))
    const taskIds = scopedTaskList.map(t => t.id)
    if (!taskIds.length) { setPendingReviews([]); setReviewHistory([]); return }
    const [{ data: pending }, { data: hist }] = await Promise.all([
      supabase.from('task_assignments').select('id, status, comment, proof_urls, started_at, task_id, user_id')
        .in('task_id', taskIds).eq('status', 'pending_review').order('started_at', { ascending: false }),
      supabase.from('task_assignments').select('id, status, comment, proof_urls, completed_at, reviewed_at, task_id, user_id')
        .in('task_id', taskIds).in('status', ['completed', 'rejected']).order('completed_at', { ascending: false }).limit(200)
    ])
    const userIds = [...new Set([...(pending || []), ...(hist || [])].map(x => x.user_id))]
    let profilesById = {}
    if (userIds.length) {
      const { data: profs } = await supabase.from('profiles').select('user_id, email, display_name, first_name, last_name').in('user_id', userIds)
      profilesById = Object.fromEntries((profs || []).map(p => [p.user_id, p]))
    }
    const empName = uid => { const p = profilesById[uid]; return p ? ([p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || p.email) : 'Сотрудник' }
    setPendingReviews((pending || []).map(item => ({ ...item, task: taskMap[item.task_id], employee_name: empName(item.user_id), employee_email: profilesById[item.user_id]?.email || '' })))
    setReviewHistory((hist || []).map(item => ({ ...item, task: taskMap[item.task_id], employee_name: empName(item.user_id) })))
  }

  const handleReview = async (action) => {
    if (!selectedReview) return
    setReviewLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/tasks/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify({ assignmentId: selectedReview.id, action, comment: reviewComment })
    })
    setReviewLoading(false)
    if (res.ok) {
      setSelectedReview(null); setReviewComment('')
      showSuccess(action === 'approve' ? 'Задание одобрено, кармики начислены' : 'Задание отклонено')
      loadData(companyId)
    } else {
      const err = await res.json()
      showError('Ошибка: ' + (err.error || 'Неизвестная ошибка'))
    }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { showError('Укажите название задания'); return }
    if (!form.reward_karma || form.reward_karma <= 0) { showError('Укажите награду больше 0'); return }
    if (form.is_auto_goal && form.auto_mode === 'specific' && !form.auto_metric_id) { showError('Выберите показатель для точного авто-задания'); return }
    if (myScope !== null && !form.department_id) { showError('Выберите отдел — вы не администратор компании, задание нужно привязать к своей команде'); return }
    setCreating(true)
    let imageUrl = null
    if (form.image_file) {
      const ext = form.image_file.name.split('.').pop()
      const path = `public/task-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, form.image_file)
      if (!upErr) imageUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/company-admin/tasks/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, image_url: imageUrl })
      })
      const d = await r.json()
      if (!r.ok) { showError(d.error || 'Не удалось создать задание'); setCreating(false); return }
      showSuccess(d.assignedCount ? `Задание создано и назначено ${d.assignedCount} сотрудникам` : 'Задание создано (пока некому назначать)')
      setForm({ ...form, title: '', description: '', image_file: null, deadline_date: '' })
      loadData(companyId)
    } catch (err) {
      showError(err.message || 'Не удалось создать задание')
    } finally {
      setCreating(false)
    }
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
          <button onClick={() => setTab('review')} style={pillTab(tab === 'review')}>На проверке{pendingReviews.length > 0 && ` · ${pendingReviews.length}`}</button>
          <button onClick={() => setTab('active')} style={pillTab(tab === 'active')}>Активные</button>
          <button onClick={() => setTab('archived')} style={pillTab(tab === 'archived')}>Архив · {archived.length}</button>
        </div>

        {(tab === 'create-goal' || tab === 'create-external') && (() => {
          const isExternal = tab === 'create-external'
          const relevantMetrics = isExternal ? metrics.filter(m => m.source === 'auto') : metrics
          return (
          <div style={{ maxWidth: 820, background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)', borderRadius: 20, padding: 28, border: `1px solid ${isExternal ? 'rgba(74,222,128,0.3)' : 'rgba(192,132,252,0.3)'}` }}>
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
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Отдел</label>
                  <select className="input-field" style={{ width: '100%' }} value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                    {myScope === null && <option value="">Вся компания</option>}
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name} (и вложенные)</option>)}
                  </select>
                </div>
              </div>

              {!isExternal && form.auto_mode === 'general' ? (
                <div style={{ marginBottom: 20 }}>
                  <select className="input-field" style={{ width: '100%' }} value={form.auto_goal_condition} onChange={e => setForm({ ...form, auto_goal_condition: e.target.value })}>
                    {Object.entries(AUTO_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12, marginBottom: 20 }}>
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
                </div>
              )}
              <p style={{ fontSize: 11, color: '#666', margin: '-14px 0 16px' }}>За выполнение начисляется +1 энергия автоматически — не редактируется отдельно.</p>
              <button type="submit" className="btn-gold">Создать задание</button>
            </form>
          </div>
          )
        })()}

        {tab === 'create' && (
          <div style={{ maxWidth: 900, background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.08)' }}>
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
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Кому назначить</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: form.target_role === 'specific' ? 10 : 0 }}>
                    {[['all', 'Все'], ['new', 'Новые'], ['experienced', 'Опытные'], ['specific', 'Выбрать сотрудников']].map(([k, label]) => (
                      <Seg key={k} active={form.target_role === k} onClick={() => setForm({ ...form, target_role: k })} color="#a0e9ff">{label}</Seg>
                    ))}
                  </div>
                  {form.target_role === 'specific' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', maxHeight: 140, overflowY: 'auto' }}>
                      {employees.length === 0 && <span style={{ fontSize: 11, color: '#777' }}>Нет сотрудников для выбора</span>}
                      {employees.map(e => {
                        const name = [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email
                        const checked = form.specific_user_ids.includes(e.user_id)
                        return (
                          <label key={e.user_id} onClick={() => setForm(f => ({ ...f, specific_user_ids: checked ? f.specific_user_ids.filter(id => id !== e.user_id) : [...f.specific_user_ids, e.user_id] }))}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', background: checked ? 'rgba(160,233,255,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${checked ? 'rgba(160,233,255,0.5)' : 'rgba(255,255,255,0.12)'}`, color: checked ? '#a0e9ff' : '#ccc' }}>
                            {name}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Отдел</label>
                  <select className="input-field" style={{ width: '100%' }} value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} disabled={form.target_role === 'specific'}>
                    {myScope === null && <option value="">Вся компания</option>}
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name} (и вложенные)</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Изображение (необязательно)</label>
                  <label htmlFor="task-image-upload" className="input-field" style={{ width: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', color: form.image_file ? '#fff' : '#777', boxSizing: 'border-box' }}>
                    {form.image_file ? form.image_file.name : 'Выбрать файл...'}
                  </label>
                  <input id="task-image-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setForm({ ...form, image_file: e.target.files?.[0] || null })} />
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

        {tab === 'review' && (
          <div>
            {pendingReviews.length === 0 ? (
              <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 50, textAlign: 'center', color: '#777', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 24 }}>
                Все задания проверены — новые отправки появятся здесь автоматически
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {pendingReviews.map(item => (
                  <div key={item.id} style={{ background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)', borderRadius: 16, padding: 18, border: '1px solid rgba(249,115,22,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.task?.title}</div>
                        <div style={{ color: '#aaa', fontSize: 13 }}>{item.employee_name}</div>
                        <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, color: '#FFD700', fontWeight: 600 }}>+{item.task?.reward_karma} кармиков</span>
                          {item.started_at && <span style={{ fontSize: 12, color: '#888' }}>отправлено {new Date(item.started_at).toLocaleString('ru')}</span>}
                        </div>
                      </div>
                      <button onClick={() => { setSelectedReview(item); setReviewComment('') }} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Проверить</button>
                    </div>
                    {item.comment && (
                      <div style={{ marginTop: 14, padding: 12, borderRadius: 10, fontSize: 13, color: '#ccc', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        Комментарий сотрудника: <span style={{ color: '#fff' }}>{item.comment}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>История решений</div>
            {reviewHistory.length === 0 ? (
              <div style={{ background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 40, textAlign: 'center', color: '#777', border: '1px solid rgba(255,255,255,0.06)' }}>Нет проверенных заданий</div>
            ) : (
              // Настоящая <table> вместо независимого grid на каждую
              // строку — раньше у каждой строки была своя колонка auto под
              // кармики, и из-за разной длины числа колонка со статусом
              // получала разную ширину от строки к строке, слово
              // «Одобрено» визуально прыгало по горизонтали.
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {reviewHistory.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '12px 10px', color: '#fff', fontSize: 14, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.task?.title}
                        <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{item.employee_name}</div>
                      </td>
                      <td style={{ padding: '12px 10px', color: '#888', fontSize: 12, whiteSpace: 'nowrap' }}>{item.completed_at && new Date(item.completed_at).toLocaleDateString('ru')}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ display: 'inline-block', fontSize: 11, padding: '3px 12px', borderRadius: 20, fontWeight: 600, background: item.status === 'completed' ? 'rgba(74,222,128,0.15)' : 'rgba(244,67,54,0.15)', color: item.status === 'completed' ? '#4ade80' : '#f87171', border: `1px solid ${item.status === 'completed' ? 'rgba(74,222,128,0.4)' : 'rgba(244,67,54,0.4)'}` }}>
                          {item.status === 'completed' ? 'Одобрено' : 'Отклонено'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', color: '#FFD700', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>+{item.task?.reward_karma}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
                <span style={{ display: 'inline-block', fontSize: 9, padding: '1px 8px', borderRadius: 20, marginTop: 6, background: t.department_id ? 'rgba(160,233,255,0.1)' : 'rgba(255,215,0,0.1)', color: t.department_id ? '#a0e9ff' : '#FFD700', border: `1px solid ${t.department_id ? 'rgba(160,233,255,0.3)' : 'rgba(255,215,0,0.3)'}` }}>
                  {t.department_id ? (departments.find(d => d.id === t.department_id)?.name || 'Отдел') : 'Вся компания'}
                </span>
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

      {selectedReview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }} onClick={() => !reviewLoading && setSelectedReview(null)}>
          <div style={{ background: 'linear-gradient(150deg, rgba(24,30,54,0.97), rgba(10,14,28,0.98))', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 20, padding: 26, maxWidth: 480, width: '94%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 16px', color: '#fff' }}>{selectedReview.task?.title}</h3>
            <div style={{ padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Сотрудник</div>
                  <div style={{ color: '#fff', fontWeight: 500 }}>{selectedReview.employee_name}</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{selectedReview.employee_email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Награда</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#FFD700' }}>+{selectedReview.task?.reward_karma}</div>
                </div>
              </div>
              {selectedReview.comment && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Комментарий сотрудника</div>
                  <div style={{ fontSize: 13, color: '#fff' }}>{selectedReview.comment}</div>
                </div>
              )}
            </div>

            {selectedReview.proof_urls?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Подтверждение</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedReview.proof_urls.map((url, i) => {
                    const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                    const isVideo = url.match(/\.(mp4|mov|webm|avi)$/i)
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
                        {isImage ? (
                          <img src={url} alt="" style={{ width: 110, height: 110, objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{ width: 110, height: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', color: '#aaa' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#a0e9ff' }}>{isVideo ? 'ВИДЕО' : 'ФАЙЛ'}</span>
                            <span style={{ fontSize: 10 }}>Открыть</span>
                          </div>
                        )}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Комментарий к решению</label>
            <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Необязательно — сотрудник получит его в уведомлении" className="input-field" style={{ width: '100%', marginBottom: 16 }} rows={3} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <button onClick={() => !reviewLoading && setSelectedReview(null)} className="btn-outline" disabled={reviewLoading}>Отмена</button>
              <button onClick={() => handleReview('reject')} disabled={reviewLoading} style={{ padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.4)', color: '#f87171', cursor: 'pointer' }}>
                {reviewLoading ? '...' : 'Отклонить'}
              </button>
              <button onClick={() => handleReview('approve')} disabled={reviewLoading} style={{ padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(74,222,128,0.15))', border: '1px solid rgba(255,215,0,0.5)', color: '#FFD700', cursor: 'pointer' }}>
                {reviewLoading ? '...' : 'Одобрить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default withAuth(TasksPage, { permission: ['can_create_tasks', 'can_review_tasks'] })
