import { useState, useEffect } from 'react'
import DatePicker from '../../components/DatePicker'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import { withAuth } from '../../components/withAuth'

function HistoryPage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState(null)
  const [history, setHistory] = useState([])
  const [filter, setFilter] = useState({ status: '', employee: '', dateFrom: '', dateTo: '' })
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single()
      if (!profile) { router.push('/'); return }
      setCompanyId(profile.company_id)
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (companyId) fetchHistory()
  }, [companyId, page, filter])

  const fetchHistory = async () => {
    // eq('tasks.company_id', ...) — фильтр по embedded-джойну, который
    // PostgREST не поддерживает как WHERE на основной таблице: запрос
    // выполнялся, но company_id не фильтровал — история была пустой.
    // Решение: получаем id задач компании отдельно, потом JOIN по ним.
    const { data: companyTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('company_id', companyId)

    if (!companyTasks || companyTasks.length === 0) {
      setHistory([])
      return
    }

    const taskIds = companyTasks.map(t => t.id)

    let query = supabase
      .from('task_assignments')
      .select(`
        id, status, comment, completed_at, reward_karma,
        user_id,
        profiles:user_id (email, display_name),
        tasks:task_id (title, reward_karma, company_id)
      `)
      .in('task_id', taskIds)
      .in('status', ['completed', 'rejected'])
      .order('completed_at', { ascending: false })
      .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)

    if (filter.status) query = query.eq('status', filter.status)
    if (filter.dateFrom) query = query.gte('completed_at', filter.dateFrom)
    if (filter.dateTo) query = query.lte('completed_at', filter.dateTo)

    const { data, error } = await query
    if (!error && data) {
      const enriched = data.map(item => ({
        ...item,
        employee_email: item.profiles?.email || '',
        employee_name: item.profiles?.display_name || ''
      })).filter(item => {
        if (filter.employee) {
          return item.employee_email.includes(filter.employee) || item.employee_name.includes(filter.employee)
        }
        return true
      })
      setHistory(enriched)
    } else {
      setHistory([])
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <BackArrow href="/company-admin" title="История заданий" />
      <div className="dash-card">
        <div className="flex flex-wrap gap-4 mb-4">
          <select className="input-field w-auto" value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})}>
            <option value="">Все статусы</option>
            <option value="completed">Выполнено</option>
            <option value="rejected">Отклонено</option>
          </select>
          <input type="text" placeholder="Сотрудник (email)" className="input-field w-auto" value={filter.employee} onChange={e => setFilter({...filter, employee: e.target.value})} />
          <DatePicker value={filter.dateFrom} onChange={v => setFilter({...filter, dateFrom: v})} placeholder="С даты" />
          <DatePicker value={filter.dateTo} onChange={v => setFilter({...filter, dateTo: v})} placeholder="По дату" />
          <button onClick={() => { setPage(0); fetchHistory(); }} className="btn-gold text-xs px-4">Применить</button>
        </div>
        <div className="max-h-80 overflow-y-auto space-y-2">
          {history.length === 0 ? (
            <p className="text-gray-400">Нет записей</p>
          ) : (
            history.map(h => (
              <div key={h.id} className="flex justify-between items-center p-2 rounded bg-gray-800">
                <div>
                  <span className="text-white">{h.tasks?.title}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${h.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{h.status === 'completed' ? 'Выполнено' : 'Отклонено'}</span>
                  <span className="text-gray-500 ml-2">{h.employee_email}</span>
                  {h.comment && <span className="text-gray-500 ml-2">— {h.comment}</span>}
                  <span className="text-xs text-gray-500 ml-2">{new Date(h.completed_at).toLocaleString('ru')}</span>
                </div>
                <span className="text-sm text-yellow-400">+ {h.tasks?.reward_karma} кармиков</span>
              </div>
            ))
          )}
        </div>
        <div className="flex justify-between mt-4">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-outline text-xs">Назад</button>
          <button onClick={() => setPage(p => p + 1)} className="btn-outline text-xs">Вперед</button>
        </div>
      </div>
    </div>
  )
}

export default withAuth(HistoryPage, { permission: 'can_review_tasks' })
