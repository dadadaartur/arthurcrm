import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import DatePicker from '../../components/DatePicker'
import { withAuth } from '../../components/withAuth'

function PurchasesAdmin() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [namesMap, setNamesMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ show: false, purchase: null })
  const [comment, setComment] = useState('')
  const [dateOption, setDateOption] = useState('any')
  const [specificDate, setSpecificDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (!prof) { router.push('/'); return }
      setCompanyId(prof.company_id)
      await loadPurchases(prof.company_id)
      setLoading(false)
    }
    init()
  }, [router])

  // Грузим напрямую тем же способом, которым дашборд считает значок —
  // поэтому список здесь и счётчик на кнопке всегда совпадают.
  const loadPurchases = async (compId) => {
    const { data: employees } = await supabase
      .from('profiles').select('user_id').eq('company_id', compId).is('deleted_at', null)
    const userIds = (employees || []).map(e => e.user_id)
    if (!userIds.length) { setPurchases([]); return }

    const { data } = await supabase
      .from('purchases').select('*')
      .in('user_id', userIds).eq('status', 'pending')
      .order('created_at', { ascending: false })
    setPurchases(data || [])

    // Имена сотрудников одним запросом
    const ids = [...new Set((data || []).map(p => p.user_id))]
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles').select('user_id, display_name, first_name, last_name, email').in('user_id', ids)
      const map = {}
      ;(profs || []).forEach(p => {
        map[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || p.email || p.user_id.slice(0, 8) + '…'
      })
      setNamesMap(map)
    }
  }

  const getName = uid => namesMap[uid] || uid?.slice(0, 8) + '…'

  const callReview = async (path, body) => {
    setSubmitting(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body)
      })
      const result = await res.json()
      if (!res.ok) { setError(result.error || 'Не удалось обработать покупку'); setSubmitting(false); return }
      setModal({ show: false, purchase: null }); setSubmitting(false)
      loadPurchases(companyId)
    } catch { setError('Сетевая ошибка — попробуйте ещё раз'); setSubmitting(false) }
  }

  const handleApprove = () => {
    if (!modal.purchase) return
    if (dateOption === 'specific' && !specificDate) { setError('Выберите дату сертификата'); return }
    callReview('/api/company-admin/approve-purchase', {
      purchaseId: modal.purchase.id, comment: comment || null, dateOption,
      specificDate: dateOption === 'specific' ? specificDate : null
    })
  }
  const handleReject = () => {
    if (!modal.purchase) return
    callReview('/api/company-admin/reject-purchase', { purchaseId: modal.purchase.id, comment: comment || null })
  }

  if (loading) return <div className="flex justify-center items-center py-24"><Spinner size={52} /></div>

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/company-admin" className="group flex items-center text-gray-400 hover:text-white transition-colors">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="transition-transform group-hover:-translate-x-1">
            <circle cx="14" cy="14" r="13" stroke="rgba(249,115,22,.4)" strokeWidth="0.8" />
            <path d="M17 8l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#d4af37' }}>Подтверждение сертификатов</h1>
      </div>

      {purchases.length === 0 ? (
        <div className="premium-card"><p className="text-gray-400">Нет запросов на подтверждение</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {purchases.map(p => (
            <div key={p.id} className="premium-card flex flex-col gap-3">
              <div>
                <h4 className="text-white font-semibold">{p.reward_name}</h4>
                <p className="text-sm text-gray-400 mt-1">Сотрудник: {getName(p.user_id)}</p>
                <p className="text-sm text-yellow-400">{p.cost} кармиков</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(p.created_at).toLocaleString('ru')}</p>
              </div>
              <button onClick={() => { setModal({ show: true, purchase: p }); setComment(''); setDateOption('any'); setSpecificDate(''); setError('') }}
                className="btn-glass text-xs px-4 py-2 self-start">
                Рассмотреть
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно рассмотрения */}
      {modal.show && modal.purchase && (
        <div className="modal-overlay" onClick={() => !submitting && setModal({ show: false, purchase: null })}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, textAlign: 'left' }}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-xl font-bold text-white pr-4">{modal.purchase.reward_name}</h3>
              <button onClick={() => !submitting && setModal({ show: false, purchase: null })} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <p className="text-sm text-gray-400 mb-4">Сотрудник: {getName(modal.purchase.user_id)} · {modal.purchase.cost} кармиков</p>

            <textarea className="input-field" rows={3} placeholder="Комментарий (увидит сотрудник)"
              value={comment} onChange={e => setComment(e.target.value)} />

            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="radio" name="cert-date" checked={dateOption === 'any'} onChange={() => setDateOption('any')} />
                Любой день
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="radio" name="cert-date" checked={dateOption === 'specific'} onChange={() => setDateOption('specific')} />
                Конкретная дата
              </label>
              {dateOption === 'specific' && (
                <DatePicker value={specificDate} onChange={v => setSpecificDate(v)} placeholder="Дата сертификата" />
              )}
            </div>

            {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={handleApprove} disabled={submitting} className="btn-glass btn-glass-green flex-1 text-sm px-3 py-2.5"
                style={{ opacity: submitting ? 0.5 : 1 }}>
                {submitting ? 'Обработка…' : 'Одобрить'}
              </button>
              <button onClick={handleReject} disabled={submitting} className="btn-glass btn-glass-red flex-1 text-sm px-3 py-2.5"
                style={{ opacity: submitting ? 0.5 : 1 }}>
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default withAuth(PurchasesAdmin, { permission: 'can_review_tasks' })
