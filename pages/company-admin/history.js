import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'

export default function HistoryPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [history, setHistory] = useState([])
  const [filter, setFilter] = useState({ status: '', employee: '', dateFrom: '', dateTo: '' })
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('*, roles(name, is_system)')
        .eq('user_id', user.id)
        .single()
      if (!data || (data.role_id !== 1 && data.role_id !== 2)) { router.push('/'); return }
      setProfile(data)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (profile) fetchHistory()
  }, [profile, page, filter])

  const fetchHistory = async () => {
    let query = supabase
      .from('task_assignments')
      .select('id, status, comment, started_at, completed_at, task_id, user_id, tasks( id, title, reward_karma )')
      .eq('tasks.company_id', profile.company_id)
      .in('status', ['completed', 'rejected'])
      .order('completed_at', { ascending: false })
      .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)

    if (filter.status) query = query.eq('status', filter.status)
    if (filter.dateFrom) query = query.gte('completed_at', filter.dateFrom)
    if (filter.dateTo) query = query.lte('completed_at', filter.dateTo)

    const { data, error } = await query
    if (!error && data) {
      const enriched = await Promise.all(data.map(async (item) => {
        const { data: profileData } = await supabase.from('profiles').select('email, display_name').eq('user_id', item.user_id).single()
        return { ...item, employee_email: profileData?.email || '', employee_name: profileData?.display_name || '' }
      }))
      let filtered = enriched
      if (filter.employee) filtered = filtered.filter(h => h.employee_email === filter.employee || h.employee_name === filter.employee)
      setHistory(filtered)
    } else setHistory([])
  }

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-8" style={{ color: '#d4af37' }}>История заданий</h1>
      <div className="dash-card">
        <div className="flex flex-wrap gap-4 mb-4">
          <select className="input-field w-auto" value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})}>
            <option value="">Все статусы</option>
            <option value="completed">Выполнено</option>
            <option value="rejected">Отклонено</option>
          </select>
          <input type="text" placeholder="Сотрудник (email)" className="input-field w-auto" value={filter.employee} onChange={e => setFilter({...filter, employee: e.target.value})} />
          <input type="date" className="input-field w-auto" value={filter.dateFrom} onChange={e => setFilter({...filter, dateFrom: e.target.value})} />
          <input type="date" className="input-field w-auto" value={filter.dateTo} onChange={e => setFilter({...filter, dateTo: e.target.value})} />
          <button onClick={() => { setPage(0); fetchHistory(); }} className="btn-gold text-xs px-4">Применить</button>
        </div>
        <div className="max-h-80 overflow-y-auto space-y-2">
          {history.length === 0 ? (
            <p className="text-gray-400">Нет записей</p>
          ) : (
            history.map(h => (
              <div key={h.id} className="flex justify-between items-center p-2 rounded bg-gray-800">
                <div>
                  <span className="text-white">{h.tasks.title}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${h.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{h.status === 'completed' ? 'Выполнено' : 'Отклонено'}</span>
                  <span className="text-gray-500 ml-2">{h.employee_email}</span>
                  {h.comment && <span className="text-gray-500 ml-2">— {h.comment}</span>}
                  <span className="text-xs text-gray-500 ml-2">{new Date(h.completed_at).toLocaleString('ru')}</span>
                </div>
                <span className="text-sm text-yellow-400">+ {h.tasks.reward_karma} кармиков</span>
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
