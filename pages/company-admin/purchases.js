import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import PremiumModal from '../../components/PremiumModal'
import Spinner from '../../components/Spinner'
import { withAuth } from '../../components/withAuth'

const STATUS_LABELS = {
  new: { label: 'Новая', color: '#FFD700' },
  pending: { label: 'Ожидает', color: '#f97316' },
  approved: { label: 'Одобрена', color: '#4ade80' },
  rejected: { label: 'Отклонена', color: '#f87171' }
}

const TYPE_LABELS = {
  physical: 'Доставка на рабочее место',
  certificate: 'Сертификат',
  digital: 'Цифровой товар'
}

function PurchasesAdmin() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | new | pending | physical
  const [modal, setModal] = useState({ show: false, purchase: null })
  const [comment, setComment] = useState('')
  const [dateOption, setDateOption] = useState('any')
  const [specificDate, setSpecificDate] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles')
        .select('company_id, is_company_admin, can_review_tasks')
        .eq('user_id', user.id).maybeSingle()
      if (!prof?.company_id) { router.push('/'); return }
      setCompanyId(prof.company_id)
      await loadPurchases(prof.company_id)
      setLoading(false)
    }
    init()
  }, [])

  const loadPurchases = async (compId) => {
    // Получаем сотрудников компании
    const { data: employees } = await supabase
      .from('profiles')
      .select('user_id, display_name, email, first_name, last_name')
      .eq('company_id', compId)
      .is('deleted_at', null)

    if (!employees?.length) { setPurchases([]); return }

    const userIds = employees.map(e => e.user_id)
    const empMap = Object.fromEntries(employees.map(e => [e.user_id, e]))

    // Все покупки сотрудников компании + данные о товаре
    const { data } = await supabase
      .from('purchases')
      .select('*, rewards(type, image_url)')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })

    const enriched = (data || []).map(p => ({
      ...p,
      reward_type: p.rewards?.type || 'physical',
      reward_image: p.rewards?.image_url || null,
      employee: empMap[p.user_id] || { email: 'Неизвестный' }
    }))
    setPurchases(enriched)
  }

  const filtered = purchases.filter(p => {
    if (filter === 'pending') return p.status === 'pending' || p.status === 'new'
    if (filter === 'physical') return p.reward_type === 'physical' && (p.status === 'pending' || p.status === 'new')
    if (filter === 'approved') return p.status === 'approved'
    return true
  })

  // Счётчики для бейджей
  const counts = {
    pending: purchases.filter(p => p.status === 'pending' || p.status === 'new').length,
    physical: purchases.filter(p => p.reward_type === 'physical' && (p.status === 'pending' || p.status === 'new')).length
  }

  const getEmployeeName = (emp) => {
    if (emp.first_name || emp.last_name) return [emp.first_name, emp.last_name].filter(Boolean).join(' ')
    return emp.display_name || emp.email || 'Сотрудник'
  }

  const openModal = (p) => {
    setModal({ show: true, purchase: p })
    setComment('')
    setDateOption('any')
    setSpecificDate('')
  }

  const handleApprove = async () => {
    if (!modal.purchase) return
    setActionLoading(true)
    const p = modal.purchase
    const { error } = await supabase.from('purchases').update({
      status: 'approved',
      approved_by: (await supabase.auth.getUser()).data.user?.id,
      approved_comment: comment,
      certificate_data: {
        valid_date: dateOption === 'any' ? 'any' : specificDate,
        comment
      }
    }).eq('id', p.id)

    if (!error) {
      await supabase.from('notifications').insert({
        user_id: p.user_id,
        message: `Ваша покупка «${p.reward_name}» одобрена!${comment ? ' Комментарий: ' + comment : ''}`,
        link: '/my-purchases'
      })
      setModal({ show: false, purchase: null })
      await loadPurchases(companyId)
    }
    setActionLoading(false)
  }

  const handleReject = async () => {
    if (!modal.purchase) return
    setActionLoading(true)
    const p = modal.purchase
    const { error } = await supabase.from('purchases').update({
      status: 'rejected',
      approved_comment: comment
    }).eq('id', p.id)

    if (!error) {
      await supabase.from('notifications').insert({
        user_id: p.user_id,
        message: `Ваша покупка «${p.reward_name}» отклонена.${comment ? ' Причина: ' + comment : ''}`,
        link: '/my-purchases'
      })
      setModal({ show: false, purchase: null })
      await loadPurchases(companyId)
    }
    setActionLoading(false)
  }

  if (loading) return (
    <div className="flex justify-center items-center py-16"><Spinner /></div>
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/company-admin" className="text-gray-400 hover:text-white text-sm mb-6 inline-block">← Назад</Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #f97316, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Покупки сотрудников
        </h1>
        {counts.pending > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)', color: '#f97316' }}>
            <span className="animate-pulse w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
            {counts.pending} ожидают подтверждения
          </div>
        )}
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'all', label: 'Все' },
          { key: 'pending', label: 'Ожидают', badge: counts.pending },
          { key: 'physical', label: 'Доставка', badge: counts.physical },
          { key: 'approved', label: 'Выданные' }
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`filter-pill ${filter === f.key ? 'active' : ''} flex items-center gap-2`}>
            {f.label}
            {f.badge > 0 && (
              <span className="min-w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center px-1"
                style={{ background: '#f97316', color: '#fff', animation: 'pulse 2s infinite' }}>
                {f.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="premium-card text-center py-12">
          <p className="text-gray-400">Нет покупок</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const st = STATUS_LABELS[p.status] || STATUS_LABELS.new
            const isPhysical = p.reward_type === 'physical'
            const needsAction = p.status === 'pending' || p.status === 'new'
            return (
              <div key={p.id} className="premium-card"
                style={{ borderColor: needsAction ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Иконка типа */}
                    <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-xl"
                      style={{ background: isPhysical ? 'rgba(249,115,22,0.15)' : 'rgba(192,132,252,0.15)' }}>
                      {isPhysical ? '📦' : '🎟'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{p.reward_name}</div>
                      <div className="text-sm text-gray-400">{getEmployeeName(p.employee)}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-semibold" style={{ color: '#FFD700' }}>{p.cost} кармиков</span>
                        <span className="text-xs" style={{ color: '#888' }}>
                          {new Date(p.created_at).toLocaleDateString('ru')}
                        </span>
                        {isPhysical && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                            Доставка
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ background: `${st.color}22`, color: st.color }}>
                      {st.label}
                    </span>
                    {needsAction && (
                      <button onClick={() => openModal(p)} className="btn-gold text-sm px-4 py-2">
                        Рассмотреть
                      </button>
                    )}
                    {!needsAction && p.approved_comment && (
                      <span className="text-xs text-gray-500 max-w-32 truncate">{p.approved_comment}</span>
                    )}
                  </div>
                </div>

                {/* Баннер для физической доставки */}
                {isPhysical && needsAction && (
                  <div className="mt-3 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                    style={{ background: 'rgba(249,115,22,0.08)', border: '1px dashed rgba(249,115,22,0.3)', color: '#f97316' }}>
                    <span>Требуется физическая доставка товара сотруднику</span>
                    <span className="text-gray-400">— {getEmployeeName(p.employee)}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Модалка рассмотрения */}
      <PremiumModal isOpen={modal.show} onClose={() => setModal({ show: false, purchase: null })}
        title={modal.purchase?.reward_name} showCloseButton={false}>
        {modal.purchase && (
          <div className="text-left space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <div className="text-sm text-gray-400">Сотрудник</div>
                <div className="text-white font-medium">{getEmployeeName(modal.purchase.employee)}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-sm text-gray-400">Стоимость</div>
                <div className="font-bold" style={{ color: '#FFD700' }}>{modal.purchase.cost} кармиков</div>
              </div>
            </div>

            {modal.purchase.reward_type === 'physical' && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316' }}>
                Физический товар — нужно вручить сотруднику лично. После одобрения он получит уведомление.
              </div>
            )}

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Дата выдачи</label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                  <input type="radio" name="date" checked={dateOption === 'any'}
                    onChange={() => setDateOption('any')} className="accent-orange-500" />
                  Любой день
                </label>
                <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                  <input type="radio" name="date" checked={dateOption === 'specific'}
                    onChange={() => setDateOption('specific')} className="accent-orange-500" />
                  Конкретная дата
                </label>
              </div>
              {dateOption === 'specific' && (
                <input type="date" value={specificDate} onChange={e => setSpecificDate(e.target.value)}
                  className="input-field" />
              )}
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Комментарий</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Необязательно" className="input-field" rows={3} />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal({ show: false, purchase: null })}
                className="btn-outline flex-1" disabled={actionLoading}>
                Отмена
              </button>
              <button onClick={handleReject} disabled={actionLoading}
                className="flex-1 py-2.5 rounded-full font-semibold text-sm transition-all"
                style={{ background: 'rgba(244,67,54,0.15)', border: '1px solid rgba(244,67,54,0.4)', color: '#f87171' }}>
                Отклонить
              </button>
              <button onClick={handleApprove} disabled={actionLoading}
                className="btn-gold flex-1">
                {actionLoading ? '...' : 'Одобрить'}
              </button>
            </div>
          </div>
        )}
      </PremiumModal>
    </div>
  )
}

export default withAuth(PurchasesAdmin, { permission: 'can_review_tasks' })
