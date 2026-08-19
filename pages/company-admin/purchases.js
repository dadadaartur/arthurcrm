import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import PremiumModal from '../../components/PremiumModal'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import DatePicker from '../../components/DatePicker'
import { withAuth } from '../../components/withAuth'

const STATUS_LABELS = {
  new: { label: 'Новая', color: '#FFD700' },
  pending: { label: 'Ожидает', color: '#FFD700' },
  approved: { label: 'Одобрена', color: '#4ade80' },
  rejected: { label: 'Отклонена', color: '#f87171' }
}
const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '9px 20px', color: '#fff', cursor: 'pointer', fontSize: 13, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none' }

function TypeIcon({ type }) {
  if (type === 'physical') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2.5l8 4v11l-8 4-8-4v-11l8-4z" stroke="#a0e9ff" strokeWidth="1.4" strokeLinejoin="round" /><path d="M4 6.5l8 4 8-4M12 10.5v11" stroke="#a0e9ff" strokeWidth="1.4" /></svg>
  )
  if (type === 'certificate') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="9" r="5.5" stroke="#FFD700" strokeWidth="1.4" /><path d="M9 13.5L7.5 21l4.5-2.5L16.5 21 15 13.5" stroke="#FFD700" strokeWidth="1.4" strokeLinejoin="round" /><path d="M10 9l1.5 1.5L14.5 7.5" stroke="#FFD700" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
  )
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="5" y="5" width="14" height="14" rx="2.5" stroke="#c084fc" strokeWidth="1.4" /><rect x="9.5" y="9.5" width="5" height="5" rx="1" stroke="#c084fc" strokeWidth="1.2" /><path d="M9 2.5V5M15 2.5V5M9 19v2.5M15 19v2.5M2.5 9H5M2.5 15H5M19 9h2.5M19 15h2.5" stroke="#c084fc" strokeWidth="1.2" strokeLinecap="round" /></svg>
  )
}

function PurchasesAdmin() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState({ show: false, purchase: null })
  const [comment, setComment] = useState('')
  const [dateOption, setDateOption] = useState('any')
  const [specificDate, setSpecificDate] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).maybeSingle()
      if (!prof?.company_id) { router.push('/'); return }
      setCompanyId(prof.company_id)
      await loadPurchases(prof.company_id)
      setLoading(false)
    }
    init()
  }, [])

  const loadPurchases = async (compId) => {
    const { data: employees } = await supabase.from('profiles').select('user_id, display_name, email, first_name, last_name').eq('company_id', compId).is('deleted_at', null)
    if (!employees?.length) { setPurchases([]); return }
    const userIds = employees.map(e => e.user_id)
    const empMap = Object.fromEntries(employees.map(e => [e.user_id, e]))
    const { data } = await supabase.from('purchases').select('*, rewards(type, image_url)').in('user_id', userIds).order('created_at', { ascending: false })
    setPurchases((data || []).map(p => ({
      ...p,
      reward_type: p.rewards?.type || 'physical',
      reward_image: p.rewards?.image_url || null,
      employee: empMap[p.user_id] || { email: 'Неизвестный' }
    })))
  }

  const filtered = purchases.filter(p => {
    if (filter === 'pending') return p.status === 'pending' || p.status === 'new'
    if (filter === 'physical') return p.reward_type === 'physical' && (p.status === 'pending' || p.status === 'new')
    if (filter === 'approved') return p.status === 'approved'
    return true
  })
  const counts = {
    pending: purchases.filter(p => p.status === 'pending' || p.status === 'new').length,
    physical: purchases.filter(p => p.reward_type === 'physical' && (p.status === 'pending' || p.status === 'new')).length
  }
  const getEmployeeName = emp => [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.display_name || emp.email || 'Сотрудник'
  const openModal = p => { setModal({ show: true, purchase: p }); setComment(''); setDateOption('any'); setSpecificDate('') }

  const handleApprove = async () => {
    if (!modal.purchase) return
    setActionLoading(true)
    const p = modal.purchase
    const { error } = await supabase.from('purchases').update({
      status: 'approved',
      approved_by: (await supabase.auth.getUser()).data.user?.id,
      approved_comment: comment,
      certificate_data: { valid_date: dateOption === 'any' ? 'any' : specificDate, comment }
    }).eq('id', p.id)
    if (!error) {
      await supabase.from('notifications').insert({ user_id: p.user_id, type: 'purchase', message: `Ваша покупка «${p.reward_name}» одобрена!${comment ? ' Комментарий: ' + comment : ''}`, link: '/my-purchases' })
      setModal({ show: false, purchase: null })
      await loadPurchases(companyId)
    }
    setActionLoading(false)
  }
  const handleReject = async () => {
    if (!modal.purchase) return
    setActionLoading(true)
    const p = modal.purchase
    const { error } = await supabase.from('purchases').update({ status: 'rejected', approved_comment: comment }).eq('id', p.id)
    if (!error) {
      await supabase.from('notifications').insert({ user_id: p.user_id, type: 'purchase', message: `Ваша покупка «${p.reward_name}» отклонена.${comment ? ' Причина: ' + comment : ''}`, link: '/my-purchases' })
      setModal({ show: false, purchase: null })
      await loadPurchases(companyId)
    }
    setActionLoading(false)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>
  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Покупки сотрудников" extra={
          counts.pending > 0 ? (
            <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.5)', color: '#FFD700', animation: 'pulse 2s infinite' }}>{counts.pending} ожидают</span>
          ) : null
        } />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {[{ key: 'all', label: 'Все' }, { key: 'pending', label: 'Ожидают', badge: counts.pending }, { key: 'physical', label: 'Доставка', badge: counts.physical }, { key: 'approved', label: 'Выданные' }].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ padding: '7px 16px', borderRadius: 20, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, background: filter === f.key ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${filter === f.key ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`, color: filter === f.key ? '#FFD700' : '#aaa', fontWeight: filter === f.key ? 700 : 400 }}>
              {f.label}
              {f.badge > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,215,0,0.2)', color: '#FFD700' }}>{f.badge}</span>}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 60, textAlign: 'center', color: '#777' }}>Нет покупок</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(p => {
              const st = STATUS_LABELS[p.status] || STATUS_LABELS.new
              const needsAction = p.status === 'pending' || p.status === 'new'
              return (
                <div key={p.id} style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 18, border: `1px solid ${needsAction ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.06)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <TypeIcon type={p.reward_type} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{p.reward_name}</div>
                        <div style={{ fontSize: 13, color: '#888' }}>{getEmployeeName(p.employee)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#FFD700' }}>{p.cost} кармиков</span>
                          <span style={{ fontSize: 12, color: '#666' }}>{new Date(p.created_at).toLocaleDateString('ru')}</span>
                          {p.reward_type === 'physical' && <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'rgba(160,233,255,0.1)', color: '#a0e9ff', border: '1px solid rgba(160,233,255,0.3)' }}>Доставка</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: `${st.color}18`, color: st.color, border: `1px solid ${st.color}44` }}>{st.label}</span>
                      {needsAction && <button onClick={() => openModal(p)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Рассмотреть</button>}
                      {!needsAction && p.approved_comment && <span style={{ fontSize: 12, color: '#666', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.approved_comment}</span>}
                    </div>
                  </div>
                  {p.reward_type === 'physical' && needsAction && (
                    <div style={{ marginTop: 12, padding: '8px 14px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(160,233,255,0.06)', border: '1px dashed rgba(160,233,255,0.3)', color: '#a0e9ff' }}>
                      Требуется физическая доставка товара сотруднику <span style={{ color: '#888' }}>— {getEmployeeName(p.employee)}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <PremiumModal isOpen={modal.show} onClose={() => setModal({ show: false, purchase: null })} title={modal.purchase?.reward_name} showCloseButton={false}>
        {modal.purchase && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: '#888' }}>Сотрудник</div>
                <div style={{ color: '#fff', fontWeight: 500 }}>{getEmployeeName(modal.purchase.employee)}</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#888' }}>Стоимость</div>
                <div style={{ fontWeight: 700, color: '#FFD700' }}>{modal.purchase.cost} кармиков</div>
              </div>
            </div>
            {modal.purchase.reward_type === 'physical' && (
              <div style={{ padding: '10px 14px', borderRadius: 12, fontSize: 13, marginBottom: 14, background: 'rgba(160,233,255,0.06)', border: '1px solid rgba(160,233,255,0.3)', color: '#a0e9ff' }}>
                Физический товар — нужно вручить сотруднику лично. После одобрения он получит уведомление.
              </div>
            )}
            <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 8 }}>Дата выдачи</label>
            <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#fff', cursor: 'pointer' }}>
                <input type="radio" checked={dateOption === 'any'} onChange={() => setDateOption('any')} /> Любой день
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#fff', cursor: 'pointer' }}>
                <input type="radio" checked={dateOption === 'specific'} onChange={() => setDateOption('specific')} /> Конкретная дата
              </label>
            </div>
            {dateOption === 'specific' && <div style={{ marginBottom: 12 }}><DatePicker value={specificDate} onChange={setSpecificDate} placeholder="Выберите дату" /></div>}
            <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 6 }}>Комментарий</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Необязательно" className="input-field" style={{ width: '100%' }} rows={3} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setModal({ show: false, purchase: null })} className="btn-outline" style={{ flex: 1 }} disabled={actionLoading}>Отмена</button>
              <button onClick={handleReject} disabled={actionLoading} style={{ flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600, background: 'rgba(244,67,54,0.12)', border: '1px solid rgba(244,67,54,0.4)', color: '#f87171', cursor: 'pointer' }}>Отклонить</button>
              <button onClick={handleApprove} disabled={actionLoading} style={{ ...ghostBtn, flex: 1, opacity: actionLoading ? 0.5 : 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Одобрить</button>
            </div>
          </div>
        )}
      </PremiumModal>
    </div>
  )
}
export default withAuth(PurchasesAdmin, { permission: 'can_review_tasks' })
