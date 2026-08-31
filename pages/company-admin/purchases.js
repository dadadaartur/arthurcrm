import { useEffect, useState } from 'react'
import DatePicker from '../../components/DatePicker'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import PremiumModal from '../../components/PremiumModal'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const STATUS_LABELS = {
  new:      { label: 'Новая',     color: '#8a6208' },
  pending:  { label: 'Ожидает',   color: '#b45309' },
  approved: { label: 'Одобрена',  color: '#137a39' },
  rejected: { label: 'Отклонена', color: '#dc2626' }
}

const pillTab = a => ({
  padding: '8px 18px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
  background: a ? 'rgba(184,134,11,0.12)' : 'var(--bg-card)',
  border: `1px solid ${a ? 'var(--border-gold)' : 'var(--border-subtle)'}`,
  color: a ? '#8a6208' : 'var(--text-secondary)', fontWeight: a ? 700 : 400,
  transition: 'all 0.2s', whiteSpace: 'nowrap', display: 'inline-flex',
  alignItems: 'center', gap: 6
})

const ghostBtn = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-gold)', borderRadius: 12,
  padding: '10px 22px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13,
  transition: 'all .25s', letterSpacing: 0.3
}
const hoverOn = e => {
  e.currentTarget.style.borderColor = '#8a6208'
  e.currentTarget.style.boxShadow = '0 0 14px rgba(138,98,8,0.18)'
  e.currentTarget.style.transform = 'translateY(-1px)'
}
const hoverOff = e => {
  e.currentTarget.style.borderColor = 'var(--border-gold)'
  e.currentTarget.style.boxShadow = 'none'
  e.currentTarget.style.transform = 'translateY(0)'
}

function PurchasesAdmin() {
  const router = useRouter()
  const { showSuccess, showError } = useFeedback()
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
    const { data: employees } = await supabase
      .from('profiles').select('user_id, display_name, email, first_name, last_name')
      .eq('company_id', compId).is('deleted_at', null)
    if (!employees?.length) { setPurchases([]); return }
    const userIds = employees.map(e => e.user_id)
    const empMap = Object.fromEntries(employees.map(e => [e.user_id, e]))
    const { data } = await supabase
      .from('purchases').select('*, rewards(type, image_url)')
      .in('user_id', userIds).order('created_at', { ascending: false })
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
    if (filter === 'rejected') return p.status === 'rejected'
    return true
  })

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
    setComment(''); setDateOption('any'); setSpecificDate('')
  }

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
      await supabase.from('notifications').insert({
        user_id: p.user_id,
        message: `Ваша покупка «${p.reward_name}» одобрена!${comment ? ' Комментарий: ' + comment : ''}`,
        link: '/my-purchases'
      })
      setModal({ show: false, purchase: null })
      showSuccess('Покупка одобрена, сотрудник уведомлён')
      await loadPurchases(companyId)
    } else {
      showError('Ошибка: ' + error.message)
    }
    setActionLoading(false)
  }

  const handleReject = async () => {
    if (!modal.purchase) return
    setActionLoading(true)
    const p = modal.purchase
    const { error } = await supabase.from('purchases').update({
      status: 'rejected', approved_comment: comment
    }).eq('id', p.id)
    if (!error) {
      await supabase.from('notifications').insert({
        user_id: p.user_id,
        message: `Ваша покупка «${p.reward_name}» отклонена.${comment ? ' Причина: ' + comment : ''}`,
        link: '/my-purchases'
      })
      setModal({ show: false, purchase: null })
      showSuccess('Покупка отклонена')
      await loadPurchases(companyId)
    } else {
      showError('Ошибка: ' + error.message)
    }
    setActionLoading(false)
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Покупки сотрудников" extra={
          counts.pending > 0 && (
            <div style={{
              marginLeft: 'auto', padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: 'rgba(180,83,9,0.1)', border: '1px solid rgba(180,83,9,0.35)', color: '#b45309',
              animation: 'pulse 2s infinite', whiteSpace: 'nowrap'
            }}>
              {counts.pending} ожидают
            </div>
          )
        } />

        {/* Фильтры — компактно, с бейджами */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('all')} style={pillTab(filter === 'all')}>Все</button>
          <button onClick={() => setFilter('pending')} style={pillTab(filter === 'pending')}>
            Ожидают {counts.pending > 0 && <span style={{ background: '#b45309', color: '#fff', padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{counts.pending}</span>}
          </button>
          <button onClick={() => setFilter('physical')} style={pillTab(filter === 'physical')}>
            Доставка {counts.physical > 0 && <span style={{ background: '#b45309', color: '#fff', padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{counts.physical}</span>}
          </button>
          <button onClick={() => setFilter('approved')} style={pillTab(filter === 'approved')}>Одобренные</button>
          <button onClick={() => setFilter('rejected')} style={pillTab(filter === 'rejected')}>Отклонённые</button>
        </div>

        {filtered.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 60,
            textAlign: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)'
          }}>
            Нет покупок по выбранному фильтру
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {filtered.map((p, i) => {
              const st = STATUS_LABELS[p.status] || STATUS_LABELS.new
              const isPhysical = p.reward_type === 'physical'
              const needsAction = p.status === 'pending' || p.status === 'new'
              return (
                <div key={p.id} style={{
                  background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)',
                  borderRadius: 16, padding: 20,
                  border: `1px solid ${needsAction ? 'rgba(180,83,9,0.35)' : 'var(--border-subtle)'}`,
                  opacity: 0, animation: `fadeUp 0.5s ${i * 0.03}s ease-out forwards`,
                  transition: 'border-color 0.25s, box-shadow 0.25s',
                  display: 'flex', flexDirection: 'column', gap: 12
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = needsAction ? 'rgba(180,83,9,0.55)' : 'var(--border-gold)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = needsAction ? 'rgba(180,83,9,0.35)' : 'var(--border-subtle)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-card)'
                }}>
                  {/* Шапка: тип + статус */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1,
                      background: isPhysical ? 'rgba(180,83,9,0.08)' : 'rgba(124,58,237,0.08)',
                      color: isPhysical ? '#b45309' : '#7c3aed',
                      border: `1px solid ${isPhysical ? 'rgba(180,83,9,0.3)' : 'rgba(124,58,237,0.3)'}`
                    }}>
                      {isPhysical ? 'ДОСТАВКА' : 'СЕРТИФИКАТ'}
                    </span>
                    <span style={{
                      fontSize: 11, padding: '3px 12px', borderRadius: 20, fontWeight: 700,
                      background: `${st.color}22`, color: st.color,
                      border: `1px solid ${st.color}44`
                    }}>{st.label}</span>
                  </div>

                  {/* Название + стоимость */}
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{p.reward_name}</div>
                    <div style={{ color: 'var(--accent-gold)', fontSize: 13, fontWeight: 600 }}>{p.cost} кармиков</div>
                  </div>

                  {/* Сотрудник + дата */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getEmployeeName(p.employee)}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {new Date(p.created_at).toLocaleDateString('ru')}
                    </span>
                  </div>

                  {/* Комментарий от прошлого решения — отдельной строкой */}
                  {!needsAction && p.approved_comment && (
                    <div style={{
                      padding: 10, borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)',
                      background: 'var(--bg-page)', border: '1px solid var(--border-subtle)'
                    }}>
                      <span style={{ color: 'var(--text-muted)' }}>Решение: </span>{p.approved_comment}
                    </div>
                  )}

                  {/* Баннер для физической доставки */}
                  {isPhysical && needsAction && (
                    <div style={{
                      padding: '8px 12px', borderRadius: 8, fontSize: 11, color: '#b45309',
                      background: 'rgba(180,83,9,0.06)', border: '1px dashed rgba(180,83,9,0.3)'
                    }}>
                      Нужно вручить сотруднику лично
                    </div>
                  )}

                  {/* Кнопка */}
                  {needsAction && (
                    <button onClick={() => openModal(p)} style={{ ...ghostBtn, marginTop: 'auto' }}
                      onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                      Рассмотреть
                    </button>
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
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                padding: 16, borderRadius: 14,
                background: 'var(--bg-page)', border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Сотрудник</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{getEmployeeName(modal.purchase.employee)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Стоимость</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-gold)' }}>{modal.purchase.cost}</div>
                  </div>
                </div>
              </div>

              {modal.purchase.reward_type === 'physical' && (
                <div style={{
                  padding: 12, borderRadius: 12, fontSize: 12,
                  background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.3)', color: '#b45309'
                }}>
                  Физический товар — нужно вручить сотруднику лично. После одобрения он получит уведомление.
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Дата выдачи</label>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input type="radio" name="date" checked={dateOption === 'any'}
                      onChange={() => setDateOption('any')} style={{ accentColor: '#8a6208' }} />
                    Любой день
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input type="radio" name="date" checked={dateOption === 'specific'}
                      onChange={() => setDateOption('specific')} style={{ accentColor: '#8a6208' }} />
                    Конкретная дата
                  </label>
                </div>
                {dateOption === 'specific' && (
                  <div style={{ marginTop: 10 }}><DatePicker value={specificDate} onChange={setSpecificDate} placeholder="Выберите дату" /></div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Комментарий</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Необязательно — сотрудник получит его в уведомлении"
                  className="input-field" style={{ width: '100%' }} rows={3} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 4 }}>
                <button onClick={() => setModal({ show: false, purchase: null })}
                  className="btn-outline" disabled={actionLoading}>Отмена</button>
                <button onClick={handleReject} disabled={actionLoading}
                  style={{
                    padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                    background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.35)',
                    color: '#dc2626', cursor: 'pointer', transition: 'all 0.25s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)' }}>
                  {actionLoading ? '...' : 'Отклонить'}
                </button>
                <button onClick={handleApprove} disabled={actionLoading}
                  style={{
                    padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                    background: 'linear-gradient(135deg, rgba(138,98,8,0.15), rgba(19,122,57,0.12))',
                    border: '1px solid var(--border-gold)', color: '#8a6208', cursor: 'pointer',
                    transition: 'all 0.25s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}>
                  {actionLoading ? '...' : 'Одобрить'}
                </button>
              </div>
            </div>
          )}
        </PremiumModal>

        <style jsx>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.65; }
          }
        `}</style>
      </div>
    </div>
  )
}
export default withAuth(PurchasesAdmin, { permission: 'can_review_tasks' })
