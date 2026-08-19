import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import DateRangePicker from '../../components/DateRangePicker'
import { withAuth } from '../../components/withAuth'

// ЭТАЛОН (кнопка «Купить» в магазине): полупрозрачная + золотая кайма
const ghostBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '10px 22px', color: '#fff', cursor: 'pointer', fontSize: 13, transition: 'all .25s' }
// ТОНКАЯ консервативная кнопка
const thinBtn = { background: 'transparent', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 8, padding: '4px 12px', color: '#D4AF37', cursor: 'pointer', fontSize: 11, letterSpacing: 0.5, transition: 'all .25s' }
const hoverOn = (e) => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)' }
const hoverOff = (e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none' }

function ResourcesPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)
  const [showEmployeesModal, setShowEmployeesModal] = useState(false)
  const [showTariffModal, setShowTariffModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [histRange, setHistRange] = useState({ from: '', to: '' })
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) { setError('Нет сессии'); setLoading(false); return }
    try {
      const res = await fetch('/api/company-admin/resources', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (res.ok) setData(await res.json())
      else { const e = await res.json(); setError(e.error || 'Ошибка загрузки') }
    } catch (e) { setError('Сетевая ошибка') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handlePay = async (amountRub, karmaAmount, paymentType, tariffCode = null) => {
    setPaying(true); setPaymentError(''); setPaymentSuccess(false)
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ amountRub, karmaAmount, paymentType, tariffCode })
      })
      const result = await res.json()
      if (!res.ok) {
        setPaymentError(result.error || 'Ошибка создания платежа')
        setTimeout(() => setPaymentError(''), 4000)
      } else if (result.confirmation_url) {
        window.location.href = result.confirmation_url
      }
    } catch (e) { setPaymentError('Сетевая ошибка'); setTimeout(() => setPaymentError(''), 4000) }
    setPaying(false)
  }

  const handleExtend = async () => {
    const tariff = data?.tariff
    if (!tariff) return
    const employees = data?.employees?.length || 1
    await handlePay((tariff.code === 'ultra' ? 10000 : tariff.price_per_employee_rub) * employees, tariff.karma_per_employee * employees, 'tariff_upgrade', tariff.code)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>
  if (error) return <div style={{ padding: '40px 32px', color: '#f87171' }}>{error}</div>
  const { account, tariff, employees, circulation, all_tariffs, payments } = data
  const fundBalance = account?.balance ?? 0
  const validUntil = account?.valid_until ? new Date(account.valid_until).toLocaleDateString('ru') : '—'
  const daysLeft = account?.valid_until ? Math.ceil((new Date(account.valid_until) - new Date()) / (1000 * 60 * 60 * 24)) : null

  const filteredEmployees = (employees || []).filter(e =>
    !employeeSearch || e.name.toLowerCase().includes(employeeSearch.toLowerCase())
  )
  const filteredPayments = (payments || []).filter(p => {
    const d = (p.paid_at || p.created_at || '').slice(0, 10)
    if (histRange.from && d < histRange.from) return false
    if (histRange.to && d > histRange.to) return false
    return true
  })

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление ресурсами" />

        {/* Анимация оплаты (чёрная дыра) */}
        {(paymentSuccess || paymentError) && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div className={paymentSuccess ? 'bh success' : 'bh error'}>
              {paymentError && <div style={{ color: '#f87171', fontSize: 15, fontWeight: 600, textAlign: 'center', maxWidth: 260 }}>{paymentError}</div>}
              {paymentSuccess && (
                <svg width="60" height="60" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="30" stroke="rgba(212,175,55,.4)" strokeWidth="2" fill="none" />
                  <path className="bh-check" d="M20 33 L28.5 41.5 L45 24" stroke="#FFD700" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
          {/* Фонд компании */}
          <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 22, border: '1px solid rgba(255,215,0,0.3)' }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Фонд компании</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#FFD700' }}>{fundBalance}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>кармиков доступно</div>
          </div>

          {/* В обороте у сотрудников — кликабельный */}
          <div onClick={() => setShowEmployeesModal(true)}
            style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 22, border: '1px solid rgba(192,132,252,0.3)', cursor: 'pointer', transition: 'all .25s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#c084fc'; e.currentTarget.style.boxShadow = '0 0 16px rgba(192,132,252,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(192,132,252,0.3)'; e.currentTarget.style.boxShadow = 'none' }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>В обороте у сотрудников</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#c084fc' }}>{circulation}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>кармиков накоплено</div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position: 'absolute', top: 20, right: 20, opacity: 0.5 }}>
              <path d="M5 2l5 5-5 5" stroke="#c084fc" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>

          {/* Текущий тариф — кликабельный */}
          <div onClick={() => setShowTariffModal(true)}
            style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 22, border: '1px solid rgba(160,233,255,0.3)', cursor: 'pointer', transition: 'all .25s', position: 'relative' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#a0e9ff'; e.currentTarget.style.boxShadow = '0 0 16px rgba(160,233,255,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(160,233,255,0.3)'; e.currentTarget.style.boxShadow = 'none' }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Текущий тариф</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{tariff?.name || '—'}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{tariff ? `${tariff.karma_per_employee} карм./сотр. в мес` : ''}</div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position: 'absolute', top: 20, right: 20, opacity: 0.5 }}>
              <path d="M5 2l5 5-5 5" stroke="#a0e9ff" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>

          {/* Действует до + ТОНКАЯ кнопка Продлить */}
          <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 22, border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
            {tariff && (
              <button onClick={handleExtend} disabled={paying} style={{ ...thinBtn, position: 'absolute', top: 14, right: 14, opacity: paying ? 0.5 : 1 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 8px rgba(255,215,0,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; e.currentTarget.style.boxShadow = 'none' }}>
                {paying ? '…' : 'Продлить'}
              </button>
            )}
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Действует до</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{validUntil}</div>
            <div style={{ fontSize: 12, color: daysLeft !== null && daysLeft <= 7 ? '#f87171' : '#666', marginTop: 4 }}>
              {daysLeft !== null ? `осталось ${daysLeft} дн.` : 'окончание тарифа'}
            </div>
          </div>
        </div>

        {/* Доступные тарифы */}
        <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Доступные тарифы</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {(all_tariffs || []).map(t => {
              const isActive = tariff?.id === t.id
              const price = t.code === 'ultra' ? 10000 : t.price_per_employee_rub
              return (
                <div key={t.id} style={{ background: isActive ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 18, border: `1px solid ${isActive ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.06)'}` }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 6 }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{t.karma_per_employee} карм./сотр. в мес</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#FFD700', marginBottom: 12 }}>{(price || 0).toLocaleString('ru')} ₽</div>
                  {!isActive && (
                    <button onClick={() => handlePay(price * (employees?.length || 1), t.karma_per_employee * (employees?.length || 1), 'tariff_upgrade', t.code)} disabled={paying}
                      style={{ ...ghostBtn, width: '100%', opacity: paying ? 0.5 : 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                      Перейти
                    </button>
                  )}
                  {isActive && <div style={{ textAlign: 'center', fontSize: 12, color: '#4ade80' }}>Активен</div>}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Пополнение фонда */}
          {[{ karma: 100, rub: 1000 }, { karma: 500, rub: 4500 }, { karma: 1000, rub: 8000 }].map(opt => (
            <button key={opt.karma} onClick={() => handlePay(opt.rub, opt.karma, 'topup')} disabled={paying}
              style={{ ...ghostBtn, opacity: paying ? 0.5 : 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              +{opt.karma} кармиков · {opt.rub.toLocaleString('ru')} ₽
            </button>
          ))}

          {/* История платежей — премиальная кнопка */}
          <button onClick={() => setShowHistoryModal(true)}
            style={{ ...ghostBtn, marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="#D4AF37" strokeWidth="1.2" />
              <path d="M8 4.5V8l2.3 1.6" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            История платежей
          </button>
        </div>

        {/* МОДАЛКА: сотрудники */}
        {showEmployeesModal && (
          <div className="modal-overlay" onClick={() => setShowEmployeesModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, background: 'linear-gradient(135deg, #c084fc, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Кармики сотрудников</h3>
                <button onClick={() => setShowEmployeesModal(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div style={{ marginBottom: 16, position: 'relative' }}>
                <input type="text" placeholder="Поиск по имени…" value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} className="input-field" style={{ paddingLeft: 40, width: '100%' }} />
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                  <circle cx="7" cy="7" r="5" stroke="#a0e9ff" strokeWidth="1.4" />
                  <path d="M11 11l3 3" stroke="#a0e9ff" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
              <div className="res-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredEmployees.length === 0 ? <p style={{ color: '#777', textAlign: 'center', padding: 20 }}>Сотрудников не найдено</p> : (
                  filteredEmployees.map(e => (
                    <div key={e.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                      <span style={{ color: '#fff', fontSize: 14 }}>{e.name}</span>
                      <span style={{ color: '#FFD700', fontWeight: 700, fontSize: 14 }}>{e.balance} карм.</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* МОДАЛКА: тариф */}
        {showTariffModal && tariff && (
          <div className="modal-overlay" onClick={() => setShowTariffModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, background: 'linear-gradient(135deg, #a0e9ff, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Тариф «{tariff.name}»</h3>
                <button onClick={() => setShowTariffModal(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>Эмиссия</div>
                <div style={{ fontSize: 17, color: '#fff', fontWeight: 600 }}>{tariff.karma_per_employee} кармиков на сотрудника в месяц</div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>Стоимость</div>
                <div style={{ fontSize: 20, color: '#FFD700', fontWeight: 700 }}>{(tariff.code === 'ultra' ? 10000 : tariff.price_per_employee_rub).toLocaleString('ru')} ₽/сотр./мес</div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>Действует до</div>
                <div style={{ fontSize: 15, color: '#fff' }}>{validUntil}{daysLeft !== null && <span style={{ fontSize: 12, color: daysLeft <= 7 ? '#f87171' : '#888', marginLeft: 8 }}>осталось {daysLeft} дн.</span>}</div>
              </div>
              <button onClick={() => { setShowTariffModal(false); handleExtend() }} style={{ ...ghostBtn, width: '100%' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                Продлить тариф
              </button>
            </div>
          </div>
        )}

        {/* МОДАЛКА: история платежей со скроллом и фирменным календарём */}
        {showHistoryModal && (
          <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, background: 'linear-gradient(135deg, #FFD700, #a0e9ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Движение средств компании</h3>
                <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div style={{ marginBottom: 16 }}>
                <DateRangePicker from={histRange.from} to={histRange.to} onChange={setHistRange} />
              </div>
              <div className="res-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 6 }}>
                {filteredPayments.length === 0 ? <p style={{ color: '#777', textAlign: 'center', padding: 24 }}>Платежей за период нет</p> : (
                  filteredPayments.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(212,175,55,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {p.payment_type === 'topup' ? (
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M4 8l4 4 4-4" stroke="#FFD700" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 14h10" stroke="#FFD700" strokeWidth="1.4" strokeLinecap="round" /></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="3.5" width="12" height="9" rx="2" stroke="#a0e9ff" strokeWidth="1.3" /><path d="M2 6.5h12" stroke="#a0e9ff" strokeWidth="1.3" /></svg>
                          )}
                        </div>
                        <div>
                          <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
                            {p.payment_type === 'topup' ? `Пополнение фонда: +${p.karma_amount} кармиков` : `Смена тарифа: ${p.tariff_code}`}
                          </div>
                          <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{new Date(p.paid_at || p.created_at).toLocaleString('ru')}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 15 }}>{Number(p.amount_rub).toLocaleString('ru')} ₽</div>
                        <div style={{ fontSize: 11, marginTop: 2, color: p.status === 'succeeded' ? '#4ade80' : p.status === 'canceled' ? '#f87171' : '#FFD700' }}>
                          {p.status === 'succeeded' ? 'Оплачено' : p.status === 'canceled' ? 'Отменён' : 'Ожидает'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .bh { width: 200px; height: 200px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .bh.success { background: radial-gradient(circle, rgba(255,215,0,0.3) 0%, rgba(255,180,0,0.15) 30%, transparent 60%); box-shadow: 0 0 60px rgba(255,215,0,0.5), 0 0 120px rgba(255,180,0,0.3); animation: bhSuccess 2.5s ease-out forwards; }
        .bh.error { background: radial-gradient(circle, rgba(248,113,113,0.3) 0%, rgba(239,68,68,0.15) 30%, transparent 60%); box-shadow: 0 0 60px rgba(248,113,113,0.5); animation: bhError 2.2s ease-out forwards; }
        @keyframes bhSuccess { 0% { transform: scale(0.3); opacity: 0; } 30% { transform: scale(1.2); opacity: 1; } 50% { transform: scale(1); } 85% { opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
        @keyframes bhError { 0% { transform: scale(0.3); opacity: 0; } 20% { transform: scale(1.1); opacity: 1; } 40% { transform: scale(0.95); } 60% { transform: scale(1.05); } 85% { opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
        .bh-check { stroke-dasharray: 60; stroke-dashoffset: 60; animation: bhDraw 0.6s ease-out 0.8s forwards; }
        @keyframes bhDraw { to { stroke-dashoffset: 0; } }
        .res-scroll { scrollbar-width: thin; scrollbar-color: rgba(212,175,55,0.4) transparent; }
        .res-scroll::-webkit-scrollbar { width: 8px; }
        .res-scroll::-webkit-scrollbar-track { background: transparent; }
        .res-scroll::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.4); border-radius: 10px; }
        .res-scroll::-webkit-scrollbar-thumb:hover { background: rgba(212,175,55,0.65); }
      `}</style>
    </div>
  )
}
export default withAuth(ResourcesPage, { anyStaff: true })
