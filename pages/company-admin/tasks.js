import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import PremiumModal from '../../components/PremiumModal'
import { withAuth } from '../../components/withAuth'

function TasksPage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [successModal, setSuccessModal] = useState({ show: false, message: '' })
  const [form, setForm] = useState({
    title: '',
    description: '',
    reward_karma: 10,
    task_type: 'one_time',
    frequency: 'once',
    target_role: 'all',
    min_energy_level: 0,
    requires_review: true,
    deadline_datetime: '',
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

    let imageUrl = null
    if (form.image_file) {
      imageUrl = await uploadImage(form.image_file)
      if (!imageUrl) return
    }

    const deadlineAt = form.deadline_datetime ? new Date(form.deadline_datetime).toISOString() : null

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        company_id: companyId,
        title: form.title,
        description: form.description,
        reward_karma: form.reward_karma,
        task_type: form.task_type,
        frequency: form.frequency,
        target_role: form.target_role,
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

    const { data: employeesList } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('company_id', companyId)
      .eq('is_company_admin', false)
      .is('deleted_at', null)

    if (employeesList && employeesList.length > 0) {
      const assignments = employeesList.map(emp => ({
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

      // НОВОЕ: уведомляем сотрудников о новом задании через серверный роут.
      // Напрямую из браузера вставлять notifications нельзя (RLS),
      // поэтому идём через /api/notifications/send.
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
              recipients: employeesList.map(emp => emp.user_id),
              type: 'task_new',
              message: `Вам назначено задание "${task.title}". Награда: +${form.reward_karma} кармиков.`,
              link: '/tasks'
            })
          })
        }
      } catch (notifyError) {
        console.error('[tasks] не удалось отправить уведомления', notifyError)
      }

      setSuccessModal({ show: true, message: `Задание создано и назначено ${employeesList.length} сотрудникам.` })
    } else {
      setSuccessModal({ show: true, message: 'Задание создано, но в компании нет сотрудников для назначения.' })
    }

    setForm({
      title: '', description: '', reward_karma: 10, task_type: 'one_time', frequency: 'once', target_role: 'all',
      min_energy_level: 0, requires_review: true, deadline_datetime: '', is_auto: false,
      crm_action_type: '', crm_target_count: 0, image_file: null
    })
    loadData(companyId)
  }

  const handleDelete = async (taskId) => {
    await supabase.from('tasks').update({ is_active: false }).eq('id', taskId)
    loadData(companyId)
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <Link href="/company-admin" className="text-gray-400 hover:text-white text-sm mb-6 inline-block">← Назад</Link>
      <h1 className="text-2xl font-bold mb-8" style={{ color: '#d4af37' }}>Управление заданиями</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="pastel-card">
          <h3 className="text-lg font-semibold mb-4">Новое задание</h3>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Название</label>
              <input type="text" className="input-field" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
            </div>
            <div>
              <label className="text-sm text-gray-400">Описание</label>
              <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm text-gray-400">Награда (кармики)</label>
                <input type="number" className="input-field" value={form.reward_karma} onChange={e => setForm({...form, reward_karma: parseInt(e.target.value) || 0})} min="1" />
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-400">Тип задания</label>
                <select className="input-field" value={form.task_type} onChange={e => setForm({...form, task_type: e.target.value})}>
                  <option value="one_time">Разовое</option>
                  <option value="recurring">Регулярное</option>
                  <option value="auto_crm">Автоматическое (CRM)</option>
                </select>
              </div>
            </div>
            {form.task_type === 'recurring' && (
              <div>
                <label className="text-sm text-gray-400">Периодичность</label>
                <select className="input-field" value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}>
                  <option value="daily">Ежедневно</option>
                  <option value="weekly">Еженедельно</option>
                  <option value="monday">По понедельникам</option>
                </select>
              </div>
            )}
            <div>
              <label className="text-sm text-gray-400">Дедлайн</label>
              <input type="datetime-local" className="input-field" value={form.deadline_datetime} onChange={e => setForm({...form, deadline_datetime: e.target.value})} />
            </div>
            <div className="flex gap-4 items-center flex-wrap">
              <label className="flex items-center gap-2 text-gray-400">
                <input type="checkbox" checked={form.requires_review} onChange={e => setForm({...form, requires_review: e.target.checked})} />
                Требуется проверка
              </label>
              <label className="flex items-center gap-2 text-gray-400">
                <input type="checkbox" checked={form.is_auto} onChange={e => setForm({...form, is_auto: e.target.checked})} />
                Авто из CRM
              </label>
              {form.is_auto && (
                <div className="flex gap-2">
                  <input type="text" placeholder="Тип (call)" className="input-field w-24" value={form.crm_action_type} onChange={e => setForm({...form, crm_action_type: e.target.value})} />
                  <input type="number" placeholder="Кол-во" className="input-field w-20" value={form.crm_target_count} onChange={e => setForm({...form, crm_target_count: parseInt(e.target.value) || 0})} />
                </div>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-400">Аватар задания</label>
              <div className="flex items-center gap-3 mt-2">
                <label className="file-upload-btn cursor-pointer inline-block">
                  Загрузить изображение
                  <input type="file" accept="image/*" onChange={e => setForm({...form, image_file: e.target.files[0]})} className="hidden" />
                </label>
                {form.image_file && <span className="text-xs text-gray-400">{form.image_file.name}</span>}
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400">Для кого</label>
              <select className="input-field mt-1" value={form.target_role} onChange={e => setForm({...form, target_role: e.target.value})}>
                <option value="all">Все МОП</option>
                <option value="new">Только новые (&lt; 1 мес.)</option>
                <option value="experienced">Опытные (&gt; 1 мес.)</option>
              </select>
            </div>
            <button type="submit" className="btn-gold w-full">Создать задание</button>
          </form>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#c7b5af' }}>Активные задания ({tasks.length})</h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {tasks.map(task => (
              <div key={task.id} className="pastel-card flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {task.image_url && <img src={task.image_url} alt="" className="w-8 h-8 rounded-full object-cover" />}
                  <div>
                    <h4 className="text-white font-medium">{task.title}</h4>
                    <p className="text-xs text-gray-400">{task.description?.slice(0, 60)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 text-sm">+{task.reward_karma}</span>
                  <button onClick={() => handleDelete(task.id)} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PremiumModal isOpen={successModal.show} onClose={() => setSuccessModal({ show: false, message: '' })} title="Информация">
        <p className="text-white">{successModal.message}</p>
      </PremiumModal>
    </div>
  )
}

export default withAuth(TasksPage, { permission: 'can_create_tasks' })
