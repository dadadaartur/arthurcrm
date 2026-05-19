import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Tasks() {
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [completed, setCompleted] = useState([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)
      loadTasks(user.id)
    })
  }, [])

  async function loadTasks(userId) {
    const { data: tasksData } = await supabase.from('tasks').select('*').eq('is_active', true)
    const { data: userTasks } = await supabase.from('user_tasks').select('task_id').eq('user_id', userId)
    setTasks(tasksData || [])
    setCompleted((userTasks || []).map(ut => ut.task_id))
  }

  async function completeTask(taskId) {
    const { error } = await supabase.from('user_tasks').insert({
      user_id: user.id,
      task_id: taskId
    })
    if (!error) {
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        await supabase.from('karma_events').insert({
          user_id: user.id,
          description: `Задание: ${task.title}`,
          amount: task.reward,
          status: 'auto_approved',
          category: 'task'
        })
      }
      setCompleted([...completed, taskId])
    } else {
      alert('Ошибка выполнения задания')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="premium-card">
        <h1 className="text-2xl font-bold text-deep-blue mb-6">Задания</h1>
        {tasks.length === 0 ? (
          <p className="text-gray-500">Нет доступных заданий</p>
        ) : (
          <ul className="space-y-4">
            {tasks.map(task => (
              <li key={task.id} className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div>
                  <p className="font-medium">{task.title}</p>
                  {task.description && <p className="text-sm text-gray-600">{task.description}</p>}
                  <p className="text-xs text-gold">+{task.reward} кармиков</p>
                </div>
                <button
                  onClick={() => completeTask(task.id)}
                  disabled={completed.includes(task.id)}
                  className={completed.includes(task.id) ? 'btn-outline opacity-50 cursor-not-allowed' : 'btn-gold'}
                >
                  {completed.includes(task.id) ? 'Выполнено' : 'Выполнить'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
