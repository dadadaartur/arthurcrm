import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import { withAuth } from '../../components/withAuth'

function GoalsPage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState(null)
  const [goals, setGoals] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  const [form, setForm] = useState({
    assign_to_all: true,
    user_ids: [],
    goal_type: 'calls',
    target_value: 10,
    period_type: 'day',
    manual_days: 30,
    reward_mode: 'none',
    reward_rubles: 0,
    reward_karma: 0
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
    const [goalsRes, empRes] = await Promise.all([
      supabase.from('goals').select('*, profiles(email, display_name)').eq('company_id', compId).eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, email, display_name').eq('company_id', compId).eq('is_company_admin', false).is('deleted_at', null)
    ])
    setGoals(goalsRes.data || [])
    setEmployees(empRes.data || [])
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000)
  }

  const handleCreateGoal = async (e) => {
    e.preventDefault()
    if (!form.assign_to_all && form.user_ids.length === 0) {
      showNotification('Выберите хотя бы одного сотрудника', 'error')
      return
    }
    if (!form.target_value || form.target_value < 1) {
      showNotification('Укажите количество больше 0', 'error')
      return
    }

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
      goal_type: form.goal_type,
      title: form.goal_type,
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
      showNotification('Ошибка создания целей: ' + error.message, 'error')
      return
    }

    setForm({
      assign_to_all: true, user_ids: [], goal_type: 'calls', target_value: 10,
      period_type: 'day', manual_days: 30, reward_mode: 'none',
      reward_rubles: 0, reward_karma: 0
    })
    showNotification(`Цели созданы (${targetUserIds.length} шт.)`)
    loadData(companyId)
  }

  const handleDeleteGoal = async (goalId) => {
    await supabase.from('goals').update({ is_active: false }).eq('id', goalId)
    loadData(companyId)
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-full mx-auto px-6 py-8">
      <Link href="/company-admin" className="text-gray-400 hover:text-white text-sm mb-6 inline-block">← Назад</Link>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#d4af37' }}>Управление целями</h1>

      <div className="pastel-card mb-8">
        <h3 className="text-lg font-semibold mb-4">Новая цель</h3>
        <form onSubmit={handleCreateGoal} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Тип цели</label>
              <select className="input-field" value={form.goal_type} onChange={e => setForm({...form, goal_type: e.target.value})}>
                <option value="calls">Звонки</option>
                <option value="emails">Письма</option>
                <option value="deals">Изменения статусов сделок</option>
                <option value="comments">Комментарии в сделке</option>
                <option value="chats">Чаты</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400">Количество</label>
              <input type="number" className="input-field" value={form.target_value} onChange={e => setForm({...form, target_value: parseInt(e.target.value) || 0})} min="1" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Период</label>
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
              <label className="text-sm text-gray-400">Награда</label>
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
            <label className="flex items-center gap-2 text-gray-400 text-sm">
              <input type="checkbox" checked={form.assign_to_all} onChange={e => setForm({...form, assign_to_all: e.target.checked})} />
              Назначить всем сотрудникам
            </label>
            {!form.assign_to_all && (
              <div>
                <label className="text-sm text-gray-400">Выберите сотрудников</label>
                <select multiple className="input-field h-32" value={form.user_ids} onChange={e => setForm({...form, user_ids: Array.from(e.target.selectedOptions, option => option.value)})}>
                  {employees.map(emp => (
                    <option key={emp.user_id} value={emp.user_id}>{emp.display_name || emp.email}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Удерживайте Ctrl/Cmd для выбора нескольких</p>
              </div>
            )}
            <button type="submit" className="btn-gold w-full mt-4">Создать</button>
          </div>
        </form>
      </div>

      <div className="pastel-card overflow-auto" style={{ maxHeight: '60vh' }}>
        {goals.length === 0 ? (
          <p className="text-gray-400">Нет активных целей</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-gray-400 border-b border-gray-700">
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
                <tr key={goal.id} className="border-b border-gray-800 hover:bg-gray-800/50">
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
                    <button onClick={() => handleDeleteGoal(goal.id)} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {notification.show && (
        <div className="fixed top-6 right-6 z-50 bg-gray-800 border border-gray-600 text-white px-6 py-4 rounded-xl shadow-lg animate-fade-in">
          {notification.message}
        </div>
      )}
    </div>
  )
}

export default withAuth(GoalsPage, { permission: 'can_review_tasks' })
