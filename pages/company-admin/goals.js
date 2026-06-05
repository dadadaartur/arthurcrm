import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import PremiumModal from '../../components/PremiumModal'

export default function GoalsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [goals, setGoals] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [form, setForm] = useState({
    user_id: '',
    goal_type: 'calls',
    target_value: 10,
    period: 'day',
    deadline_mode: 'auto',
    manual_deadline: '',
    reward_mode: 'none',
    reward_rubles: 0,
    reward_karma: 0
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, roles(name, is_system)')
        .eq('user_id', user.id)
        .single()

      if (!profileData || (profileData.role_id !== 1 && profileData.role_id !== 2)) {
        router.push('/')
        return
      }
      setProfile(profileData)
      await Promise.all([fetchGoals(), fetchEmployees()])
      setLoading(false)
    }
    init()
  }, [])

  const fetchGoals = async () => {
    const { data } = await supabase
      .from('goals')
      .select('*, profiles(email, display_name)')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setGoals(data || [])
  }

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, email, display_name')
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)
    setEmployees(data || [])
  }

  const handleCreateGoal = async () => {
    setSubmitError('')
    if (!form.user_id) {
      setSubmitError('Выберите сотрудника')
      return
    }
    if (!form.target_value || form.target_value < 1) {
      setSubmitError('Укажите количество больше 0')
      return
    }

    let title = ''
    switch (form.goal_type) {
      case 'calls': title = 'Звонки'; break
      case 'emails': title = 'Письма'; break
      case 'deals': title = 'Изменения статусов сделок'; break
      case 'comments': title = 'Комментарии в сделке'; break
      case 'chats': title = 'Чаты'; break
    }

    let deadline = null
    if (form.deadline_mode === 'auto') {
      const now = new Date()
      if (form.period === 'day') {
        deadline = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
      } else if (form.period === 'week') {
        const nextWeek = new Date(now)
        nextWeek.setDate(now.getDate() + (7 - now.getDay()))
        deadline = nextWeek.toISOString()
      } else if (form.period === 'month') {
        deadline = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
      }
    } else {
      deadline = form.manual_deadline ? new Date(form.manual_deadline).toISOString() : null
    }

    const rewardRubles = form.reward_mode === 'rubles' || form.reward_mode === 'combo' ? form.reward_rubles : 0
    const rewardKarma = form.reward_mode === 'karma' || form.reward_mode === 'combo' ? form.reward_karma : 0

    const { error } = await supabase.from('goals').insert({
      company_id: profile.company_id,
      user_id: form.user_id,
      goal_type: form.goal_type,
      title,
      target_value: form.target_value,
      period: form.period,
      reward_rubles: rewardRubles,
      reward_karma: rewardKarma,
      deadline,
      created_by: profile.user_id
    })

    if (error) {
      setSubmitError('Ошибка создания цели: ' + error.message)
    } else {
      setShowModal(false)
      setForm({
        user_id: '',
        goal_type: 'calls',
        target_value: 10,
        period: 'day',
        deadline_mode: 'auto',
        manual_deadline: '',
        reward_mode: 'none',
        reward_rubles: 0,
        reward_karma: 0
      })
      fetchGoals()
    }
  }

  const handleDeleteGoal = async (goalId) => {
    const { error } = await supabase.from('goals').update({ is_active: false }).eq('id', goalId)
    if (!error) fetchGoals()
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Цели компании</h1>
        <button onClick={() => setShowModal(true)} className="btn-gold px-6 py-2.5 text-sm">
          Создать цель
        </button>
      </div>

      {goals.length === 0 ? (
        <p className="text-gray-400">Нет активных целей</p>
      ) : (
        <div className="overflow-x-auto">
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
                  <td className="py-3 pr-4">
                    {goal.current_value} / {goal.target_value}
                  </td>
                  <td className="py-3 pr-4">
                    {goal.reward_karma > 0 && `+${goal.reward_karma} к.`}
                    {goal.reward_rubles > 0 && ` +${goal.reward_rubles} ₽`}
                    {!goal.reward_karma && !goal.reward_rubles && '—'}
                  </td>
                  <td className="py-3">
                    <button onClick={() => handleDeleteGoal(goal.id)} className="text-xs text-red-400 hover:text-red-300">
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Модальное окно создания */}
      <PremiumModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Создать цель"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">Сотрудник</label>
            <select
              className="input-field no-arrow"
              value={form.user_id}
              onChange={e => setForm({ ...form, user_id: e.target.value })}
            >
              <option value="">Выберите сотрудника</option>
              {employees.map(emp => (
                <option key={emp.user_id} value={emp.user_id}>{emp.display_name || emp.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400">Тип цели</label>
            <select className="input-field no-arrow" value={form.goal_type} onChange={e => setForm({ ...form, goal_type: e.target.value })}>
              <option value="calls">Звонки</option>
              <option value="emails">Письма</option>
              <option value="deals">Изменения статусов сделок</option>
              <option value="comments">Кол-во комментариев в сделке</option>
              <option value="chats">Чаты</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400">Количество</label>
            <input type="number" className="input-field" value={form.target_value} onChange={e => setForm({ ...form, target_value: parseInt(e.target.value) || 0 })} min="1" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Период</label>
            <select className="input-field no-arrow" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
              <option value="day">День</option>
              <option value="week">Неделя</option>
              <option value="month">Месяц</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400">Дедлайн</label>
            <select className="input-field no-arrow" value={form.deadline_mode} onChange={e => setForm({ ...form, deadline_mode: e.target.value })}>
              <option value="auto">Автоматически (по периоду)</option>
              <option value="manual">Вручную</option>
            </select>
            {form.deadline_mode === 'manual' && (
              <input type="date" className="input-field mt-2" value={form.manual_deadline} onChange={e => setForm({ ...form, manual_deadline: e.target.value })} />
            )}
          </div>
          <div>
            <label className="text-sm text-gray-400">Награда</label>
            <select className="input-field no-arrow" value={form.reward_mode} onChange={e => setForm({ ...form, reward_mode: e.target.value })}>
              <option value="none">Без награды</option>
              <option value="rubles">Только рубли</option>
              <option value="karma">Только кармики</option>
              <option value="combo">Комбо (рубли + кармики)</option>
            </select>
          </div>
          {(form.reward_mode === 'rubles' || form.reward_mode === 'combo') && (
            <div>
              <label className="text-sm text-gray-400">Рубли</label>
              <input type="number" className="input-field" value={form.reward_rubles} onChange={e => setForm({ ...form, reward_rubles: parseInt(e.target.value) || 0 })} min="0" />
            </div>
          )}
          {(form.reward_mode === 'karma' || form.reward_mode === 'combo') && (
            <div>
              <label className="text-sm text-gray-400">Кармики</label>
              <input type="number" className="input-field" value={form.reward_karma} onChange={e => setForm({ ...form, reward_karma: parseInt(e.target.value) || 0 })} min="0" />
            </div>
          )}
          {submitError && <p className="text-red-400 text-sm">{submitError}</p>}
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowModal(false)} className="btn-outline">Отмена</button>
            <button onClick={handleCreateGoal} className="btn-gold">Создать</button>
          </div>
        </div>
      </PremiumModal>
    </div>
  )
}
