import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'

export default function TasksPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [activeTasks, setActiveTasks] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await loadTasks(user.id)
      setLoading(false)
    }
    init()
  }, [])

  const loadTasks = async (userId) => {
    const { data: active } = await supabase
      .from('task_assignments')
      .select('id, status, started_at, deadline_at, task_id, tasks( id, title, description, reward_karma, icon )')
      .eq('user_id', userId)
      .in('status', ['assigned', 'in_progress', 'pending_review'])
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: completed } = await supabase
      .from('task_assignments')
      .select('id, status, comment, started_at, completed_at, task_id, tasks( id, title, reward_karma, icon )')
      .eq('user_id', userId)
      .in('status', ['completed', 'rejected'])
      .order('completed_at', { ascending: false })
      .limit(30)

    setActiveTasks(active || [])
    setHistory(completed || [])
  }

  const handleStart = async (assignmentId) => {
    await supabase.from('task_assignments').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', assignmentId)
    if (user) loadTasks(user.id)
  }

  const handleSubmit = async (assignmentId) => {
    await supabase.from('task_assignments').update({ status: 'pending_review', completed_at: new Date().toISOString() }).eq('id', assignmentId)
    if (user) loadTasks(user.id)
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  const inProgress = activeTasks.filter(t => t.status === 'in_progress').length
  const completedCount = history.filter(t => t.status === 'completed').length
  const earned = history.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.tasks?.reward_karma || 0), 0)

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Мои задания</h1>
        <button onClick={() => router.push('/')} className="action-btn text-xs">На главную</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="dash-card text-center">
          <p className="text-gray-400 text-sm">В работе</p>
          <p className="text-2xl font-bold text-white">{inProgress}</p>
        </div>
        <div className="dash-card text-center">
          <p className="text-gray-400 text-sm">Выполнено</p>
          <p className="text-2xl font-bold text-green-400">{completedCount}</p>
        </div>
        <div className="dash-card text-center">
          <p className="text-gray-400 text-sm">Заработано</p>
          <p className="text-2xl font-bold text-yellow-400">+{earned}</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button onClick={() => setActiveTab('active')} className={`filter-pill ${activeTab === 'active' ? 'active' : ''}`}>Активные ({activeTasks.length})</button>
        <button onClick={() => setActiveTab('history')} className={`filter-pill ${activeTab === 'history' ? 'active' : ''}`}>История ({history.length})</button>
      </div>

      {activeTab === 'active' && (
        activeTasks.length === 0 ? (
          <p className="text-gray-400">Нет активных заданий</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTasks.map(assignment => {
              const t = assignment.tasks
              return (
                <div key={assignment.id} className="premium-card" style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #1A1A2E 100%)' }}>
                  <div className="flex items-start gap-3">
                    {t.icon && <span className="text-2xl">{t.icon}</span>}
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">{t.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">{t.description}</p>
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-yellow-400 text-sm">+ {t.reward_karma} кармиков</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          assignment.status === 'pending_review' ? 'bg-purple-900 text-purple-300' :
                          assignment.status === 'in_progress' ? 'bg-orange-900 text-orange-300' : 'bg-gray-700 text-gray-300'
                        }`}>
                          {assignment.status === 'assigned' ? 'Новое' : assignment.status === 'in_progress' ? 'В работе' : 'На проверке'}
                        </span>
                      </div>
                      <div className="mt-3">
                        {assignment.status === 'assigned' && (
                          <button onClick={() => handleStart(assignment.id)} className="action-btn w-full text-xs py-1.5">Начать</button>
                        )}
                        {assignment.status === 'in_progress' && (
                          <button onClick={() => handleSubmit(assignment.id)} className="action-btn w-full text-xs py-1.5">Отправить на проверку</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {activeTab === 'history' && (
        history.length === 0 ? (
          <p className="text-gray-400">Нет завершённых заданий</p>
        ) : (
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="flex justify-between items-center p-3 rounded bg-gray-800">
                <div className="flex items-center gap-3">
                  {h.tasks.icon && <span className="text-xl">{h.tasks.icon}</span>}
                  <div>
                    <span className="text-white">{h.tasks.title}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${h.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{h.status === 'completed' ? 'Выполнено' : 'Отклонено'}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(h.completed_at).toLocaleString('ru')}</p>
                  </div>
                </div>
                <span className="text-yellow-400 text-sm">+ {h.tasks.reward_karma} кармиков</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
