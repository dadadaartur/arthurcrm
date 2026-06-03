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
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (user) {
      loadTasks(user.id)
    }
  }, [user])

  const loadTasks = async (userId) => {
    if (!userId) return

    const { data: active } = await supabase
      .from('task_assignments')
      .select('id, status, started_at, deadline_at, task_id, tasks( id, title, description, reward_karma, image_url )')
      .eq('user_id', userId)
      .in('status', ['assigned', 'in_progress', 'pending_review'])
      .limit(50)

    const { data: completed } = await supabase
      .from('task_assignments')
      .select('id, status, comment, started_at, completed_at, task_id, tasks( id, title, reward_karma )')
      .eq('user_id', userId)
      .in('status', ['completed', 'rejected'])
      .order('completed_at', { ascending: false })
      .limit(50)

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

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white transition-colors p-1" title="На главную">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-white">Мои задания</h1>
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
              if (!t) return null // если задача не найдена, пропускаем
              return (
                <div key={assignment.id} className="premium-card relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #1E1B4B 0%, #1A1A2E 100%)',
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)',
                  }}
                >
                  <div className="relative z-10">
                    <div className="flex items-start gap-3 mb-2">
                      {t.image_url && <img src={t.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{t.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          assignment.status === 'pending_review' ? 'bg-purple-900 text-purple-300' :
                          assignment.status === 'in_progress' ? 'bg-orange-900 text-orange-300' : 'bg-gray-700 text-gray-300'
                        }`}>
                          {assignment.status === 'assigned' ? 'Новое' : assignment.status === 'in_progress' ? 'В работе' : 'На проверке'}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{t.description}</p>
                    <div className="flex justify-between items-center text-xs mb-3">
                      <span className="text-yellow-400">+ {t.reward_karma} кармиков</span>
                      {assignment.deadline_at && (
                        <span className="text-gray-500 font-mono">{new Date(assignment.deadline_at).toLocaleString('ru')}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {assignment.status === 'assigned' && (
                        <button onClick={() => handleStart(assignment.id)} className="action-btn w-full text-xs py-1.5">
                          Начать
                        </button>
                      )}
                      {assignment.status === 'in_progress' && (
                        <button onClick={() => router.push(`/task/${assignment.id}`)} className="action-btn w-full text-xs py-1.5">
                          Отправить на проверку
                        </button>
                      )}
                      {assignment.status === 'pending_review' && (
                        <div className="w-full text-center text-xs py-1.5" style={{ color: 'rgba(192,132,252,0.9)' }}>
                          Ожидает проверки
                        </div>
                      )}
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
          <div className="max-h-96 overflow-y-auto space-y-2">
            {history.map(h => {
              const t = h.tasks
              if (!t) return null
              return (
                <div key={h.id} className="flex justify-between items-center p-3 rounded bg-gray-800">
                  <div>
                    <span className="text-white">{t.title}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${h.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                      {h.status === 'completed' ? 'Выполнено' : 'Отклонено'}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(h.completed_at).toLocaleString('ru')}</p>
                  </div>
                  <span className="text-yellow-400 text-sm">+ {t.reward_karma} кармиков</span>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
