import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

function GoalsPage() {
  const router = useRouter()
  const { showSuccess, showError } = useFeedback()
  const [companyId, setCompanyId] = useState(null)
  const [goals, setGoals] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    assign_to_all: true,
    user_ids: [],
    goal_type: 'calls',
    custom_goal_type: '',
    goal_title: '',
    use_custom_type: false,
    target_value: 10,
    period_type: 'day',
    manual_days: 30,
    reward_mode: 'none',
    reward_rubles: 0,
    reward_karma: 0
  })

  useEffect(() => {
    const init = async () => {
      try {
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
      } catch (e) {
        showError('Не удалось загрузить раздел целей: ' + (e.message || 'ошибка соединения'))
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const loadData = async (compId) => {
    const [goalsRes, empRes] = await Promise.all([
      supabase.from('goals').select('*, profiles(email, display_name)').eq('company_id', compId).eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, email, display_name').eq('company_id', compId).eq('is_company_admin', false).is('deleted_at', null)
    ])
    if (goalsRes.error) showError('Не удалось загрузить список целей: ' + goalsRes.error.message)
    setGoals(goalsRes.data || [])
    setEmployees(empRes.data || [])
  }

  const handleCreateGoal = async (e) => {
    e.preventDefault()
    if (!form.assign_to_all && form.user_ids.length === 0) {
      showError('Выберите хотя бы одного сотрудника')
      return
    }
    if (!form.target_value || form.target_value < 1) {
      showError('Укажите количество больше 0')
      return
    }

    try {
      const targetUserIds = form.assign_to_all ? employees.map(e => e.user_id) : form.user_ids

      let deadline = null
      if (form.period_type === 'manual') {
        const d = new Date()
        d.setDate(d.getDate() + (form.manual_days || 30))
        deadline = d.toISOString()
      } else {
        const now = new Date()
        if (form.period_type === 'day') {
          deadline = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
        } else if (form.period_type === 'week') {
          const nextWeek = new Date(now)
          nextWeek.setDate(now.getDate() + (7 - now.getDay()))
          deadline = nextWeek.toISOString()
        } else if (form.period_type === 'month') {
          deadline = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
        }
      }

      const inserts = targetUserIds.map(userId => ({
        company_id: companyId,
        user_id: userId,
        goal_type: form.use_custom_type ? (form.custom_goal_type || 'custom') : form.goal_type,
        title: form.use_custom_type ? (form.goal_title || form.custom_goal_type) : (form.goal_title || form.goal_type),
        target_value: form.target_value,
        period: form.period_type === 'manual' ? 'custom' : form.period_type,
        reward_rubles: form.reward_mode === 'rubles' || form.reward_mode === 'combo' ? form.reward_rubles : 0,
        reward_karma: form.reward_mode === 'karma' || form.reward_mode === 'combo' ? form.reward_karma : 0,
        deadline,
        is_active: true,
        created_by: null
      }))

      const { error } = await supabase.from('goals').insert(inserts)
      if (error) {
        showError('Ошибка создания целей: ' + error.message)
        return
      }

      setForm({
        assign_to_all: true, user_ids: [], goal_type: 'calls',
        custom_goal_type: '', goal_title: '', use_custom_type: false,
        target_value: 10, period_type: 'day', manual_days: 30,
        reward_mode: 'none', reward_rubles: 0, reward_karma: 0
      })
      showSuccess(`Цели созданы (${targetUserIds.length} шт.)`)
      loadData(companyId)
    } catch (e) {
      showError('Не удалось создать цели — проверьте соединение и попробуйте снова')
    }
  }

  const handleDeleteGoal = async (goalId) => {
    await supabase.from('goals').update({ is_active: false }).eq('id', goalId)
    loadData(companyId)
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="theme-light mx-auto px-6 py-8" style={{ maxWidth: 1600 }}>
      <BackArrow href="/company-admin" title="Управление целями" />

      <div className="pastel-card mb-8" style={{ maxWidth: 1100 }}>
        <h3 className="text-lg font-semibold mb-4">Новая цель</h3>
        <form onSubmit={handleCreateGoal} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Тип цели</label>
              <div className="flex items-center gap-3 mb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                  <input type="radio" checked={!form.use_custom_type} onChange={() => setForm({...form, use_custom_type: false})} className="accent-orange-500" />
                  Из списка
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                  <input type="radio" checked={form.use_custom_type} onChange={() => setForm({...form, use_custom_type: true})} className="accent-orange-500" />
                  Ручной ввод
                </label>
              </div>
              {form.use_custom_type ? (
                <input type="text" className="input-field" placeholder="Например: Презентации, Встречи, Продажи..."
                  value={form.custom_goal_type} onChange={e => setForm({...form, custom_goal_type: e.target.value})} />
              ) : (
                <select className="input-field" value={form.goal_type} onChange={e => setForm({...form, goal_type: e.target.value})}>
                  <option value="calls">Звонки</option>
                  <option value="emails">Письма</option>
                  <option value="deals">Изменения статусов сделок</option>
                  <option value="comments">Комментарии в сделке</option>
                  <option value="chats">Чаты</option>
                </select>
              )}
              <div className="mt-2">
                <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Название (отображается у сотрудника)</label>
                <input type="text" className="input-field" placeholder="Необязательно — если оставить пустым, используется тип цели"
                  value={form.goal_title} onChange={e => setForm({...form, goal_title: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Количество</label>
              <input type="number" className="input-field" value={form.target_value} onChange={e => setForm({...form, target_value: parseInt(e.target.value) || 0})} min="1" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Период</label>
              <select className="input-field" value={form.period_type} onChange={e => setForm({...form, period_type: e.target.value})}>
                <option value="day">День</option>
                <option value="week">Неделя</option>
                <option value="month">Месяц</option>
                <option value="manual">Ручной (дней)</option>
              </select>
              {form.period_type === 'manual' && (
                <input type="number" className="input-field mt-2" placeholder="Количество дней" value={form.manual_days} onChange={e => setForm({...form, manual_days: parseInt(e.target.value) || 30})} min="1" />
              )}
            </div>
            <div>
              <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Награда</label>
              <select className="input-field" value={form.reward_mode} onChange={e => setForm({...form, reward_mode: e.target.value})}>
                <option value="none">Без награды</option>
                <option value="rubles">Только рубли</option>
                <option value="karma">Только кармики</option>
                <option value="combo">Комбо</option>
              </select>
              <div className="flex gap-2 mt-2">
                {(form.reward_mode === 'rubles' || form.reward_mode === 'combo') && (
                  <input type="number" className="input-field" placeholder="Рубли" value={form.reward_rubles} onChange={e => setForm({...form, reward_rubles: parseInt(e.target.value) || 0})} min="0" />
                )}
                {(form.reward_mode === 'karma' || form.reward_mode === 'combo') && (
                  <input type="number" className="input-field" placeholder="Кармики" value={form.reward_karma} onChange={e => setForm({...form, reward_karma: parseInt(e.target.value) || 0})} min="0" />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.assign_to_all} onChange={e => setForm({...form, assign_to_all: e.target.checked})} />
              Назначить всем сотрудникам
            </label>
            {!form.assign_to_all && (
              <div>
                <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Выберите сотрудников</label>
                <select multiple className="input-field h-32" value={form.user_ids} onChange={e => setForm({...form, user_ids: Array.from(e.target.selectedOptions, option => option.value)})}>
                  {employees.map(emp => (
                    <option key={emp.user_id} value={emp.user_id}>{emp.display_name || emp.email}</option>
                  ))}
                </select>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Удерживайте Ctrl/Cmd для выбора нескольких</p>
              </div>
            )}
            <button type="submit" className="btn-gold mt-4" style={{ minWidth: 180 }}>Создать</button>
          </div>
        </form>
      </div>

      <div className="pastel-card overflow-auto" style={{ maxHeight: '60vh' }}>
        {goals.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Нет активных целей</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
              <tr>
                <th className="py-2 pr-4">Сотрудник</th>
                <th className="py-2 pr-4">Цель</th>
                <th className="py-2 pr-4">Тип</th>
                <th className="py-2 pr-4">Прогресс</th>
                <th className="py-2 pr-4">Награда</th>
                <th className="py-2">Действия</th>
              </tr>
            </thead>
            <tbody>
              {goals.map(goal => (
                <tr key={goal.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="py-3 pr-4">{goal.profiles?.display_name || goal.profiles?.email}</td>
                  <td className="py-3 pr-4">{goal.title}</td>
                  <td className="py-3 pr-4 capitalize">{goal.goal_type}</td>
                  <td className="py-3 pr-4">{goal.current_value} / {goal.target_value}</td>
                  <td className="py-3 pr-4">
                    {goal.reward_karma > 0 && `+${goal.reward_karma} к.`}
                    {goal.reward_rubles > 0 && ` +${goal.reward_rubles} ₽`}
                    {!goal.reward_karma && !goal.reward_rubles && '—'}
                  </td>
                  <td className="py-3">
                    <button onClick={() => handleDeleteGoal(goal.id)} className="text-xs" style={{ color: '#dc2626' }}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default withAuth(GoalsPage, { permission: 'can_review_tasks' })
