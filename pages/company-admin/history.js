import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import DateRangePicker from '../../components/DateRangePicker'
import { withAuth } from '../../components/withAuth'
import { getPlural } from '../../lib/format'

function HistoryPage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState(null)
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', employee: '', dateFrom: '', dateTo: '' })
  const [page, setPage] = useState(0)
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
      await fetchHistory(profile.company_id)
      setLoading(false)
    }
    init()
  }, [router])

  const fetchHistory = async (compId) => {
    const { data: companyTasks } = await supabase
      .from('tasks')
      .select('id, title, reward_karma')
      .eq('company_id', compId)
    if (!companyTasks?.length) { setAll([]); return }
    const taskMap = {}
    companyTasks.forEach(t => { taskMap[t.id] = t })

    const { data: rows, error } = await supabase
      .from('task_assignments')
      .select('id, status, comment, started_at, completed_at, user_id, task_id')
      .in('task_id', companyTasks.map(t => t.id))
      .in('status', ['completed', 'rejected', 'in_progress'])
      .order('completed_at', { ascending: false })
      .limit(500)

    if (error || !rows) { setAll([]); return }

    // Имена сотрудников одним запросом (embed profiles:user_id ломался
    // из-за отсутствия FK — отсюда "история не работала")
    const userIds = [...new Set(rows.map(r => r.user_id))]
    const nameMap = {}
    if (userIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, email, display_name, first_name, last_name')
        .in('user_id', userIds)
      ;(profs || []).forEach(p => {
        nameMap[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ')
          || p.display_name || p.email || p.user_id.slice(0, 8) + '…'
      })
    }

    setAll(rows.map(r => ({
      ...r,
      task: taskMap[r.task_id] || null,
      employee: nameMap[r.user_id] || r.user_id.slice(0, 8) + '…'
    })))
  }

  const filtered = all.filter(h => {
    if (filter.status && h.status !== filter.status) return false
    if (filter.employee) {
      const q = filter.employee.toLowerCase()
      if (!h.employee.toLowerCase().includes(q)) return false
    }
    const refDate = h.completed_at || h.started_at
    if (filter.dateFrom && refDate) {
      const from = new Date(filter.dateFrom); from.setHours(0, 0, 0, 0)
      if (new Date(refDate) < from) return false
    }
    if (filter.dateTo && refDate) {
      const to = new Date(filter.dateTo); to.setHours(23, 59, 59, 999)
      if (new Date(refDate) > to) return false
    }
    return true
  })

  const paginated = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  if (loading) return <div className="flex justify-center items-center py-24"><Spinner text="Загружаем историю…" /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/company-admin" className="group flex items-center text-gray-400 hover:text-white transition-colors">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"
            className="transition-transform group-hover:-translate-x-1">
            <circle cx="14" cy="14" r="13" stroke="rgba(249,115,22,.4)" strokeWidth="0.8" />
            <path d="M17 8l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#d4af37' }}>История заданий</h1>
      </div>

      <div className="premium-card mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Статус</label>
            <select className="input-field w-auto" value={filter.status}
              onChange={e => { setFilter({ ...filter, status: e.target.value }); setPage(0) }}>
              <option value="">Все статусы</option>
              <option value="completed">Выполнено</option>
              <option value="rejected">Отклонено</option>
              <option value="in_progress">В работе</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Сотрудник</label>
            <input type="text" placeholder="Имя или email" className="input-field"
              style={{ width: 220 }}
              value={filter.employee}
              onChange={e => { setFilter({ ...filter, employee: e.target.value }); setPage(0) }} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Период</label>
            <DateRangePicker
              from={filter.dateFrom}
              to={filter.dateTo}
              onChange={({ from, to }) => { setFilter({ ...filter, dateFrom: from, dateTo: to }); setPage(0) }}
            />
          </div>
        </div>
      </div>

      <div className="premium-card">
        <p className="text-xs text-gray-500 mb-3">
          {filtered.length} {getPlural(filtered.length, ['запись', 'записи', 'записей'])}
        </p>
        <div className="space-y-2">
          {paginated.length === 0 && <p className="text-gray-400">Нет записей</p>}
          {paginated.map(h => (
            <div key={h.id} className="flex justify-between items-center p-3 rounded bg-gray-800">
              <div className="min-w-0">
                <span className="text-white">{h.task?.title || 'Задание удалено'}</span>
                <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                  h.status === 'completed' ? 'bg-green-900 text-green-300' :
                  h.status === 'rejected' ? 'bg-red-900 text-red-300' :
                  'bg-orange-900 text-orange-300'
                }`}>
                  {h.status === 'completed' ? 'Выполнено' : h.status === 'rejected' ? 'Отклонено' : 'В работе'}
                </span>
                <span className="text-gray-500 ml-2">{h.employee}</span>
                {h.comment && <span className="text-gray-500 ml-2">— {h.comment}</span>}
                <span className="text-xs text-gray-500 ml-2">
                  {new Date(h.completed_at || h.started_at).toLocaleString('ru')}
                </span>
              </div>
              <span className="text-sm text-yellow-400 flex-shrink-0 ml-3">+ {h.task?.reward_karma ?? 0} кармиков</span>
            </div>
          ))}
        </div>

        {filtered.length > ITEMS_PER_PAGE && (
          <div className="flex justify-between items-center mt-4">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-glass text-xs">Назад</button>
            <span className="text-xs text-gray-500">
              {page + 1} из {Math.ceil(filtered.length / ITEMS_PER_PAGE)}
            </span>
            <button onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * ITEMS_PER_PAGE >= filtered.length} className="btn-glass text-xs">Вперед</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default withAuth(HistoryPage, { permission: 'can_review_tasks' })
