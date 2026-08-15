import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import PremiumModal from '../../components/PremiumModal'
import DatePicker from '../../components/DatePicker'
import { withAuth } from '../../components/withAuth'

const TASK_TYPE_LABELS = { one_time: 'Разовое', recurring: 'Регулярное', auto_crm: 'Авто из CRM' }

function TasksPage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [successModal, setSuccessModal] = useState({ show: false, message: '' })
  const [detailTask, setDetailTask] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [form, setForm] = useState({
    title: '',
    description: '',
    reward_karma: 10,
    task_type: 'one_time',
    frequency: 'once',
    target_kind: 'all',
    target_position_id: '',
    min_energy_level: 0,
    requires_review: true,
    deadline_date: '',
    deadline_time: '',
    is_auto: false,
    crm_action_type: '',
    crm_target_count: 0,
    image_file: null
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single()
      if (!profileData) { router.push('/'); return }
      const compId = profileData.company_id
      setCompanyId(compId)
      await loadData(compId)
      setLoading(false)
    }
    init()
  }, [router])

  const loadData = async (compId) => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('company_id', compId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setTasks(data || [])
    const { data: pos } = await supabase
      .from('positions')
      .select('*')
      .eq('company_id', compId)
      .order('title')
    setPositions(pos || [])
  }

  const uploadImage = async (file) => {
    if (!file) return null
    const fileExt = file.name.split('.').pop()
    const fileName = `task-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const { error } = await supabase.storage.from('avatars').upload(`public/${fileName}`, file)
    if (error) {
      setSuccessModal({ show: true, message: 'Ошибка загрузки изображения: ' + error.message })
      return null
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(`public/${fileName}`)
    return data?.publicUrl || null
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!form.reward_karma || form.reward_karma <= 0) {
      setSuccessModal({ show: true, message: 'Укажите награду больше 0' })
      return
    }
    if (form.target_kind === 'position' && !form.target_position_id) {
      setSuccessModal({ show: true, message: 'Выберите должность для назначения' })
      return
    }

    let imageUrl = null
    if (form.image_file) {
      imageUrl = await uploadImage(form.image_file)
      if (!imageUrl) return
    }

    // Дедлайн: фирменный календарь (дата) + время
    const deadlineAt = form.deadline_date
      ? new Date(`${form.deadline_date}T${form.deadline_time || '23:59'}`).toISOString()
      : null

    const targetRole = form.target_kind === 'position'
      ? `position:${form.target_position_id}`
      : form.target_kind

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        company_id: companyId,
        title: form.title,
        description: form.description,
        reward_karma: form.reward_karma,
        task_type: form.task_type,
        frequency: form.frequency,
        target_role: targetRole,
        min_energy_level: form.min_energy_level,
        requires_review: form.requires_review,
        deadline_at: deadlineAt,
        created_by: null,
        is_active: true,
        is_auto: form.is_auto,
        crm_action_type: form.crm_action_type,
        crm_target_count: form.crm_target_count,
        image_url: imageUrl
      })
      .select()
      .single()

    if (taskError) {
      setSuccessModal({ show: true, message: 'Ошибка создания задания: ' + taskError.message })
      return
    }

    // Реальная фильтрация исполнителей по выбранному критерию.
    // Раньше задание назначалось ВСЕМ без учёта target_role — поэтому
    // наставники видели задания МОПов.
    const { data: employeesList } = await supabase
      .from('profiles')
      .select('user_id, hire_date, position_id')
      .eq('company_id', companyId)
      .eq('is_company_admin', false)
      .is('deleted_at', null)

    let targets = employeesList || []
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    if (form.target_kind === 'new') {
      targets = targets.filter(emp => emp.hire_date && new Date(emp.hire_date).getTime() >= monthAgo)
    } else if (form.target_kind === 'experienced') {
      targets = targets.filter(emp => emp.hire_date && new Date(emp.hire_date).getTime() < monthAgo)
    } else if (form.target_kind === 'position') {
      targets = targets.filter(emp => emp.position_id && String(emp.position_id) === String(form.target_position_id))
    }

    if (targets.length > 0) {
      const assignments = targets.map(emp => ({
        task_id: task.id,
        user_id: emp.user_id,
        status: 'assigned',
        deadline_at: deadlineAt
      }))
      const { error: assignError } = await supabase.from('task_assignments').insert(assignments)
      if (assignError) {
        await supabase.from('tasks').delete().eq('id', task.id)
        setSuccessModal({ show: true, message: 'Ошибка назначения: ' + assignError.message })
        return
      }

      // Уведомление сотрудникам о новом задании через серверный роут
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          await fetch('/api/notifications/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              recipients: targets.map(emp => emp.user_id),
              type: 'task_new',
              message: `Вам назначено задание "${task.title}". Награда: +${form.reward_karma} кармиков.`,
              link: '/tasks'
            })
          })
        }
      } catch (notifyError) {
        console.error('[tasks] не удалось отправить уведомления', notifyError)
      }

      setSuccessModal({ show: true, message: `Задание создано и назначено ${targets.length} сотрудникам.` })
    } else {
      setSuccessModal({
        show: true,
        message: 'Задание создано, но под выбранный критерий не попал ни один сотрудник. Для «новичков» и «специалистов» у сотрудников должна быть заполнена дата трудоустройства.'
      })
    }

    setForm({
      title: '', description: '', reward_karma: 10, task_type: 'one_time', frequency: 'once',
      target_kind: 'all', target_position_id: '', min_energy_level: 0, requires_review: true,
      deadline_date: '', deadline_time: '', is_auto: false, crm_action_type: '', crm_target_count: 0,
      image_file: null
    })
    loadData(companyId)
  }

  const handleDelete = async (taskId) => {
    await supabase.from('tasks').update({ is_active: false }).eq('id', taskId)
    setDetailTask(null)
    loadData(companyId)
  }

  const targetLabel = (t) => {
    if (!t || t === 'all') return 'Все сотрудники'
    if (t === 'new') return 'Новички (до 1 месяца)'
    if (t === 'experienced') return 'Специалисты (после 1 месяца)'
    if (String(t).startsWith('position:')) {
      const id = parseInt(String(t).split(':')[1], 10)
      const pos = positions.find(p => p.id === id)
      return pos ? `Должность: ${pos.title}` : 'По должности'
    }
    return t
  }

  const filteredTasks = typeFilter === 'all' ? tasks : tasks.filter(t => t.task_type === typeFilter)

  if (loading) return <div className="flex justify-center items-center py-24"><Spinner text="Загружаем задания…" /></div>

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/company-admin" className="group flex items-center text-gray-400 hover:text-white transition-colors">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"
            className="transition-transform group-hover:-translate-x-1">
            <circle cx="14" cy="14" r="13" stroke="rgba(249,115,22,.4)" strokeWidth="0.8" />
            <path d="M17 8l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#d4af37' }}>Управление заданиями</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* === Форма создания === */}
        <div className="premium-card">
          <h3 className="text-lg font-semibold mb-4 text-white">Новое задание</h3>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Название</label>
              <input type="text" className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm text-gray-400">Описание</label>
              <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm text-gray-400">Награда (кармики)</label>
                <input type="number" className="input-field" value={form.reward_karma} onChange={e => setForm({ ...form, reward_karma: parseInt(e.target.value) || 0 })} min="1" />
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-400">Тип задания</label>
                <select className="input-field" value={form.task_type} onChange={e => setForm({ ...form, task_type: e.target.value })}>
                  <option value="one_time">Разовое</option>
                  <option value="recurring">Регулярное</option>
                  <option value="auto_crm">Автоматическое (CRM)</option>
                </select>
              </div>
            </div>
            {form.task_type === 'recurring' && (
              <div>
                <label className="text-sm text-gray-400">Периодичность</label>
                <select className="input-field" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                  <option value="daily">Ежедневно</option>
                  <option value="weekly">Еженедельно</option>
                  <option value="monday">По понедельникам</option>
                </select>
              </div>
            )}

            {/* Дедлайн: фирменный календарь + время */}
            <div>
              <label className="text-sm text-gray-400">Дедлайн</label>
              <div className="flex gap-2 mt-1">
                <div className="flex-1">
                  <DatePicker
                    value={form.deadline_date}
                    onChange={v => setForm({ ...form, deadline_date: v })}
                    placeholder="Дата (необязательно)"
                  />
                </div>
                <input type="time" className="input-field" style={{ maxWidth: 130 }}
                  value={form.deadline_time}
                  onChange={e => setForm({ ...form, deadline_time: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-4 items-center flex-wrap">
              <label className="flex items-center gap-2 text-gray-400">
                <input type="checkbox" checked={form.requires_review} onChange={e => setForm({ ...form, requires_review: e.target.checked })} />
                Требуется проверка
              </label>
              <label className="flex items-center gap-2 text-gray-400">
                <input type="checkbox" checked={form.is_auto} onChange={e => setForm({ ...form, is_auto: e.target.checked })} />
                Авто из CRM
              </label>
              {form.is_auto && (
                <div className="flex gap-2">
                  <input type="text" placeholder="Тип (call)" className="input-field w-24" value={form.crm_action_type} onChange={e => setForm({ ...form, crm_action_type: e.target.value })} />
                  <input type="number" placeholder="Кол-во" className="input-field w-20" value={form.crm_target_count} onChange={e => setForm({ ...form, crm_target_count: parseInt(e.target.value) || 0 })} />
                </div>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-400">Аватар задания</label>
              <div className="flex items-center gap-3 mt-2">
                <label className="btn-glass cursor-pointer inline-block text-sm">
                  Загрузить изображение
                  <input type="file" accept="image/*" onChange={e => setForm({ ...form, image_file: e.target.files[0] })} className="hidden" />
                </label>
                {form.image_file && <span className="text-xs text-gray-400">{form.image_file.name}</span>}
              </div>
            </div>

            {/* Для кого — логика реально применяется при назначении */}
            <div>
              <label className="text-sm text-gray-400">Для кого</label>
              <select className="input-field mt-1" value={form.target_kind} onChange={e => setForm({ ...form, target_kind: e.target.value })}>
                <option value="all">Все сотрудники</option>
                <option value="new">Новички (до 1 месяца стажа)</option>
                <option value="experienced">Специалисты (после 1 месяца стажа)</option>
                <option value="position">Конкретная должность</option>
              </select>
              {form.target_kind === 'position' && (
                <select className="input-field mt-2" value={form.target_position_id} onChange={e => setForm({ ...form, target_position_id: e.target.value })}>
                  <option value="">Выберите должность</option>
                  {positions.map(pos => <option key={pos.id} value={pos.id}>{pos.title}</option>)}
                </select>
              )}
              <p className="text-[11px] text-gray-500 mt-1">
                Стаж считается от «Даты трудоустройства» в профиле сотрудника. Например, чтобы задание получили только МОПы, выберите их должность — наставники его не увидят.
              </p>
            </div>

            <button type="submit" className="btn-glass w-full">Создать задание</button>
          </form>
        </div>

        {/* === Активные задания: фильтр по типу + скролл === */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-white">Активные задания ({filteredTasks.length})</h3>
          <div className="flex gap-2 flex-wrap mb-4">
            {[
              { key: 'all', label: 'Все' },
              { key: 'one_time', label: 'Разовые' },
              { key: 'recurring', label: 'Регулярные' },
              { key: 'auto_crm', label: 'Авто из CRM' }
            ].map(f => (
              <button key={f.key} onClick={() => setTypeFilter(f.key)}
                className={`filter-pill ${typeFilter === f.key ? 'active' : ''}`}
                style={{ minWidth: 'auto' }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Скролл, если заданий много */}
          <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 560 }}>
            {filteredTasks.length === 0 && <p className="text-gray-500 text-sm">Заданий нет</p>}
            {filteredTasks.map(task => (
              <div key={task.id}
                onClick={() => setDetailTask(task)}
                className="premium-card flex justify-between items-center transition-all hover:-translate-y-0.5"
                style={{ cursor: 'pointer', padding: '16px 20px' }}>
                <div className="flex items-center gap-3 min-w-0">
                  {task.image_url && <img src={task.image_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />}
                  <div className="min-w-0">
                    <h4 className="text-white font-medium truncate">{task.title}</h4>
                    <p className="text-xs text-gray-400 truncate">
                      {TASK_TYPE_LABELS[task.task_type] || 'Разовое'} · {targetLabel(task.target_role)}
                    </p>
                  </div>
                </div>
                <span className="text-yellow-400 text-sm flex-shrink-0 ml-3">+{task.reward_karma}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === Модалка с полным описанием задания === */}
      {detailTask && (
        <div className="modal-overlay" onClick={() => setDetailTask(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, textAlign: 'left' }}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white pr-4">{detailTask.title}</h3>
              <button onClick={() => setDetailTask(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            {detailTask.image_url && (
              <img src={detailTask.image_url} alt="" className="w-full rounded-xl object-cover mb-4" style={{ maxHeight: 220 }} />
            )}
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-4">
              {detailTask.description || 'Описания нет'}
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Награда</span><span className="text-yellow-400 font-semibold">+{detailTask.reward_karma} кармиков</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Тип</span><span className="text-white">{TASK_TYPE_LABELS[detailTask.task_type] || 'Разовое'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Для кого</span><span className="text-white">{targetLabel(detailTask.target_role)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Проверка</span><span className="text-white">{detailTask.requires_review ? 'Требуется' : 'Не требуется'}</span></div>
              {detailTask.deadline_at && (
                <div className="flex justify-between"><span className="text-gray-400">Дедлайн</span><span className="text-white">{new Date(detailTask.deadline_at).toLocaleString('ru')}</span></div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDetailTask(null)} className="btn-glass flex-1">Закрыть</button>
              <button onClick={() => handleDelete(detailTask.id)} className="btn-glass btn-glass-red flex-1">Удалить задание</button>
            </div>
          </div>
        </div>
      )}

      <PremiumModal isOpen={successModal.show} onClose={() => setSuccessModal({ show: false, message: '' })} title="Информация">
        <p className="text-white">{successModal.message}</p>
      </PremiumModal>
    </div>
  )
}

export default withAuth(TasksPage, { permission: 'can_create_tasks' })
