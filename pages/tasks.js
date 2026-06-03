import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'
import PremiumModal from '../components/PremiumModal'

export default function TasksPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [activeTasks, setActiveTasks] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('new')

  const [submitModal, setSubmitModal] = useState({ show: false, assignmentId: null, comment: '' })
  const [submitting, setSubmitting] = useState(false)

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
    if (user) loadTasks(user.id)
  }, [user])

  const loadTasks = async (userId) => {
    if (!userId) return
    const { data: active } = await supabase
      .from('task_assignments')
      .select('id, status, started_at, deadline_at, task_id, tasks( id, title, description, reward_karma, image_url )')
      .eq('user_id', userId)
      .in('status', ['assigned', 'in_progress', 'pending_review'])
      .limit(50)

    console.log('Активные назначения:', active)

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
    const { error } = await supabase
      .from('task_assignments')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', assignmentId)

    if (!error) {
      alert('Задание принято в работу')
      if (user) loadTasks(user.id)
    }
  }

  const openSubmitModal = (assignmentId) => setSubmitModal({ show: true, assignmentId, comment: '' })

  const handleSubmit = async () => {
    if (!user || !submitModal.assignmentId) return
    setSubmitting(true)
    const { error } = await supabase
      .from('task_assignments')
      .update({
        status: 'pending_review',
        comment: submitModal.comment,
        completed_at: new Date().toISOString()
      })
      .eq('id', submitModal.assignmentId)
      .eq('user_id', user.id)

    if (!error) {
      setSubmitModal({ show: false, assignmentId: null, comment: '' })
      loadTasks(user.id)
    } else {
      alert('Ошибка отправки')
    }
    setSubmitting(false)
  }

  const filteredTasks = activeTasks.filter(assignment => {
    if (activeTab === 'new') return assignment.status === 'assigned'
    if (activeTab === 'in_progress') return assignment.status === 'in_progress'
    if (activeTab === 'pending_review') return assignment.status === 'pending_review'
    return false
  })

  if (activeTab === 'in_progress') {
    filteredTasks.sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
  }
  if (activeTab === 'pending_review') {
    filteredTasks.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
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
        <div className="ml-auto text-sm text-gray-400">{user?.email}</div>
      </div>

      <div className="flex gap-4 mb-6">
        {[
          { key: 'new', label: 'Новые', count: activeTasks.filter(t => t.status === 'assigned').length },
          { key: 'in_progress', label: 'В работе', count: activeTasks.filter(t => t.status === 'in_progress').length },
          { key: 'pending_review', label: 'На проверке', count: activeTasks.filter(t => t.status === 'pending_review').length },
          { key: 'history', label: 'История', count: history.length }
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`filter-pill ${activeTab === tab.key ? 'active' : ''}`}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {activeTab !== 'history' && (
        filteredTasks.length === 0 ? (
          <p className="text-gray-400">Нет заданий</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map(assignment => {
              const t = assignment.tasks
              // Если задача не загружена, показываем карточку с пояснением
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
                      {t?.image_url && <img src={t.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">
                          {t ? t.title : `Задача ID: ${assignment.task_id} (не найдена)`}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          assignment.status === 'pending_review' ? 'bg-purple-900 text-purple-300' :
                          assignment.status === 'in_progress' ? 'bg-orange-900 text-orange-300' : 'bg-gray-700 text-gray-300'
                        }`}>
                          {assignment.status === 'assigned' ? 'Новое' : assignment.status === 'in_progress' ? 'В работе' : 'На проверке'}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">
                      {t ? t.description : 'Описание недоступно'}
                    </p>
                    <div className="flex justify-between items-center text-xs mb-3">
                      <span className="text-yellow-400">+ {t?.reward_karma ?? '?'} кармиков</span>
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
                        <button onClick={() => openSubmitModal(assignment.id)} className="action-btn w-full text-xs py-1.5">
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

      {submitModal.show && (
        <div className="modal-overlay" onClick={() => setSubmitModal({ show: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4 text-gold">Отправить на проверку</h3>
            <textarea
              className="input-field"
              placeholder="Введите комментарий (номер заказа, результат)"
              value={submitModal.comment}
              onChange={e => setSubmitModal({ ...submitModal, comment: e.target.value })}
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setSubmitModal({ show: false })} className="btn-outline">Отмена</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-gold">
                {submitting ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
