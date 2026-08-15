import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import { withAuth } from '../../components/withAuth'

function PurchasesAdmin() {
  const router = useRouter()
  const [purchases, setPurchases] = useState([])
  const [namesMap, setNamesMap] = useState({})
  const [modal, setModal] = useState({ show: false, purchase: null })
  const [comment, setComment] = useState('')
  const [dateOption, setDateOption] = useState('any')
  const [specificDate, setSpecificDate] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPurchases()
  }, [])

  const loadPurchases = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    try {
      const res = await fetch('/api/company-admin/get-pending-purchases', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const data = res.ok ? await res.json() : []
      const list = Array.isArray(data) ? data : []
      setPurchases(list)

      // Подтягиваем имена сотрудников одним запросом
      const userIds = [...new Set(list.map(p => p.user_id))]
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name, email')
          .in('user_id', userIds)
        const map = {}
        ;(profiles || []).forEach(p => {
          map[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ')
            || p.display_name || p.email || p.user_id.slice(0, 8) + '…'
        })
        setNamesMap(map)
      }
    } catch {
      setPurchases([])
    }
  }

  // ОДОБРЕНИЕ — через серверный роут: он проверяет права и компанию,
  // защищает от гонки двух модераторов и сам отправляет уведомление
  // сотруднику (с клиента вставлять notifications запрещает RLS).
  const handleApprove = async () => {
    const { purchase } = modal
    if (!purchase || processing) return
    if (dateOption === 'specific' && !specificDate) {
      setError('Выберите дату сертификата')
      return
    }
    setProcessing(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/company-admin/approve-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          purchaseId: purchase.id,
          comment: comment || null,
          dateOption,
          specificDate: dateOption === 'specific' ? specificDate : null
        })
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Не удалось одобрить покупку')
        setProcessing(false)
        return
      }
      setModal({ show: false, purchase: null })
      setProcessing(false)
      loadPurchases()
    } catch {
      setError('Сетевая ошибка — попробуйте ещё раз')
      setProcessing(false)
    }
  }

  // ОТКЛОНЕНИЕ — через серверный роут: он возвращает кармики сотруднику
  // (refund_karma_balance) и отправляет уведомление с причиной.
  const handleReject = async () => {
    const { purchase } = modal
    if (!purchase || processing) return
    setProcessing(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/company-admin/reject-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          purchaseId: purchase.id,
          comment: comment || null
        })
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Не удалось отклонить покупку')
        setProcessing(false)
        return
      }
      setModal({ show: false, purchase: null })
      setProcessing(false)
      loadPurchases()
    } catch {
      setError('Сетевая ошибка — попробуйте ещё раз')
      setProcessing(false)
    }
  }

  const getName = (uid) => namesMap[uid] || uid?.slice(0, 8) + '…'

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 20px', position: 'relative' }}>
      {/* Звёзды */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        {Array.from({ length: 80 }).map((_, i) => {
          const size = Math.random() * 2 + 0.5
          const colors = ['#ffffff', '#ffe0d0', '#ffddaa', '#d0e0ff', '#ffffdd', '#ffe4c4']
          const color = colors[Math.floor(Math.random() * colors.length)]
          return (
            <div key={i} style={{
              position: 'absolute', left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
              width: size + 'px', height: size + 'px', borderRadius: '50%', background: color,
              boxShadow: `0 0 ${size * 2}px ${color}`,
              opacity: Math.random() * 0.5 + 0.3,
              animation: `twinkle ${Math.random() * 10 + 5}s ease-in-out infinite`,
              animationDelay: Math.random() * 10 + 's'
            }} />
          )
        })}
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto' }}>
        <Link href="/company-admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#aaa', textDecoration: 'none', marginBottom: 24 }}>
          <span style={{ fontSize: 18 }}>←</span> Назад
        </Link>
        <h1 style={{ fontSize: 28, marginBottom: 32, background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Подтверждение сертификатов</h1>

        {purchases.length === 0 ? <p style={{ color: '#aaa' }}>Нет запросов</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {purchases.map(p => (
              <div key={p.id} style={{
                background: 'rgba(20,25,45,0.9)', backdropFilter: 'blur(10px)',
                borderRadius: 16, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 18 }}>{p.reward_name}</div>
                  <div style={{ fontSize: 14, color: '#aaa' }}>Сотрудник: {getName(p.user_id)}</div>
                  <div style={{ fontSize: 14, color: '#FFD700' }}>{p.cost} кармиков</div>
                </div>
                <button
                  onClick={() => { setModal({ show: true, purchase: p }); setComment(''); setDateOption('any'); setSpecificDate(''); setError('') }}
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #e65c00)', border: 'none', color: '#fff',
                    padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 600
                  }}
                >
                  Рассмотреть
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно рассмотрения */}
      {modal.show && modal.purchase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => !processing && setModal({ show: false, purchase: null })}>
          <div style={{ background: '#1a1f2f', borderRadius: 20, padding: 32, maxWidth: 500, width: '90%', border: '1px solid rgba(255,215,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, marginBottom: 4, color: '#fff' }}>{modal.purchase.reward_name}</h3>
            <p style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>
              Сотрудник: {getName(modal.purchase.user_id)} · {modal.purchase.cost} кармиков
            </p>

            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Комментарий (увидит сотрудник)"
              style={{ width: '100%', padding: 12, borderRadius: 10, background: '#111', border: '1px solid #333', color: '#fff', marginBottom: 16 }}
              rows={3}
            />

            <div style={{ marginBottom: 16 }}>
              <label style={{ marginRight: 16, color: '#fff' }}>
                <input type="radio" name="date" checked={dateOption === 'any'} onChange={() => setDateOption('any')} /> Любой день
              </label>
              <label style={{ color: '#fff' }}>
                <input type="radio" name="date" checked={dateOption === 'specific'} onChange={() => setDateOption('specific')} /> Конкретная дата
              </label>
              {dateOption === 'specific' && (
                <input type="date" value={specificDate} onChange={e => setSpecificDate(e.target.value)} style={{ marginLeft: 12, background: '#111', border: '1px solid #333', color: '#fff', padding: 8, borderRadius: 8 }} />
              )}
            </div>

            {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleApprove}
                disabled={processing}
                style={{
                  flex: 1, background: 'linear-gradient(135deg, #f97316, #e65c00)', color: '#fff',
                  padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600,
                  opacity: processing ? 0.5 : 1
                }}
              >
                {processing ? 'Обработка…' : 'Одобрить'}
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                style={{
                  flex: 1, background: 'rgba(244,68,68,0.1)', color: '#f87171',
                  padding: '12px', borderRadius: 10, border: '1px solid rgba(244,68,68,0.5)',
                  cursor: 'pointer', fontWeight: 600, opacity: processing ? 0.5 : 1
                }}
              >
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}

export default withAuth(PurchasesAdmin, { permission: 'can_review_tasks' })
