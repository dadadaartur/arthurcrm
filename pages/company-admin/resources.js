import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import { withAuth } from '../../components/withAuth'

const goldBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '10px 24px', color: '#fff', cursor: 'pointer', fontSize: 14, transition: 'all .25s' }

function ResourcesPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)
  const [payMsg, setPayMsg] = useState('')
  const [showEmployeesModal, setShowEmployeesModal] = useState(false)
  const [showTariffModal, setShowTariffModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
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
    setPaying(true); setPayMsg(''); setPaymentSuccess(false); setPaymentError('')
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
    const { data: { session } } = await supabase.auth.getSession()
    const tariff = data?.tariff
    if (!tariff) return
    await handlePay(tariff.price_per_employee_rub * (data.employees?.length || 1), tariff.karma_per_employee * (data.employees?.length || 1), 'tariff_upgrade', tariff.code)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>
  if (error) return <div style={{ padding: '40px 32px', color: '#f87171' }}>{error}</div>
  const { account, tariff, employees, circulation, all_tariffs, payments } = data
  const fundBalance = account?.balance ?? 0
  const validUntil = account?.valid_until ? new Date(account.valid_until).toLocaleDateString('ru') : '—'
  const daysLeft = account?.valid_until ? Math.ceil((new Date(account.valid_until) - new Date()) / (1000 * 60 * 60 * 24)) : null

  const filteredEmployees = employees.filter(e =>
    !employeeSearch || e.name.toLowerCase().includes(employeeSearch.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление ресурсами" />

        {/* Анимация оплаты (чёрная дыра) */}
        {(paymentSuccess || paymentError) && (
          <div className="payment-animation-overlay">
            <div className={`payment-black-hole ${paymentSuccess ? 'success' : 'error'}`}>
              {paymentError && (
                <div className="payment-error-text">{paymentError}</div>
              )}
              {paymentSuccess && (
                <div className="payment-checkmark">
                  <svg width="60" height="60" viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="30" stroke="rgba(212,175,55,.4)" strokeWidth="2" fill="none" />
                    <path className="payment-check-path" d="M20 33 L28.5 41.5 L45 24" stroke="#FFD700" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
          {/* Фонд компании */}
          <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 22, border: '1px solid rgba(255,215,0,0.3)', position: 'relative' }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Фонд компании</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#FFD700' }}>{fundBalance}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>кармиков доступно</div>
          </div>

          {/* В обороте у сотрудников (кликабельный) */}
          <div onClick={() => setShowEmployeesModal(true)} style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 22, border: '1px solid rgba(192,132,252,0.3)', cursor: 'pointer', transition: 'all .25s', position: 'relative' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#c084fc'; e.currentTarget.style.boxShadow = '0 0 16px rgba(192,132,252,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(192,132,252,0.3)'; e.currentTarget.style.boxShadow = 'none' }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>В обороте у сотрудников</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#c084fc' }}>{circulation}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>кармиков накоплено</div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', top: 22, right: 22, opacity: 0.5 }}>
              <path d="M4 6l4 4 4-4" stroke="#c084fc" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>

          {/* Текущий тариф (кликабельный) */}
          <div onClick={() => setShowTariffModal(true)} style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 22, border: '1px solid rgba(160,233,255,0.3)', cursor: 'pointer', transition: 'all .25s', position: 'relative' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#a0e9ff'; e.currentTarget.style.boxShadow = '0 0 16px rgba(160,233,255,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(160,233,255,0.3)'; e.currentTarget.style.boxShadow = 'none' }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Текущий тариф</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{tariff?.name || '—'}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{tariff ? `${tariff.karma_per_employee} карм./сотр. в мес` : ''}</div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', top: 22, right: 22, opacity: 0.5 }}>
              <path d="M4 6l4 4 4-4" stroke="#a0e9ff" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>

          {/* Действует до с кнопкой Продлить */}
          <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 22, border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Действует до</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{validUntil}</div>
            <div style={{ fontSize: 12, color: daysLeft !== null && daysLeft <= 7 ? '#f87171' : '#666', marginTop: 4 }}>
              {daysLeft !== null ? `осталось ${daysLeft} дн.` : 'окончание тарифа'}
            </div>
            {tariff && (
              <button onClick={handleExtend} disabled={paying} className="extend-btn" style={{ position: 'absolute', top: 16, right: 16, opacity: paying ? 0.5 : 1 }}>
                Продлить
              </button>
            )}
          </div>
        </div>

        {/* Доступные тарифы */}
        <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Доступные тарифы</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {all_tariffs.map(t => {
              const isActive = tariff?.id === t.id
              const price = t.code === 'ultra' ? 10000 : t.price_per_employee_rub
              return (
                <div key={t.id} style={{ background: isActive ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 18, border: `1px solid ${isActive ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.06)'}` }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 6 }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{t.karma_per_employee} карм./сотр. в мес</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#FFD700', marginBottom: 12 }}>{price.toLocaleString('ru')} ₽</div>
                  {!isActive && (
                    <button onClick={() => handlePay(price * (employees?.length || 1), t.karma_per_employee * (employees?.length || 1), 'tariff_upgrade', t.code)} disabled={paying} style={{ ...goldBtn, width: '100%', opacity: paying ? 0.5 : 1 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.3)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none' }}>
                      {paying ? 'Создаём…' : 'Перейти'}
                    </button>
                  )}
                  {isActive && <div style={{ textAlign: 'center', fontSize: 13, color: '#4ade80' }}>Активен</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Пополнение фонда */}
        <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Пополнить фонд</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { karma: 100, rub: 1000 },
              { karma: 500, rub: 4500 },
              { karma: 1000, rub: 8000 },
            ].map(opt => (
              <button key={opt.karma} onClick={() => handlePay(opt.rub, opt.karma, 'topup')} disabled={paying} className="glass-btn" style={{ opacity: paying ? 0.5 : 1 }}>
                +{opt.karma} кармиков
                <div style={{ fontSize: 12, color: '#FFD700', marginTop: 4 }}>{opt.rub.toLocaleString('ru')} ₽</div>
              </button>
            ))}
          </div>
        </div>

        {/* История платежей (кнопка с разворачиванием) */}
        <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div onClick={() => setShowHistoryModal(!showHistoryModal)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff', margin: 0 }}>История платежей</h3>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: showHistoryModal ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }}>
              <path d="M4 6l4 4 4-4" stroke="#a0e9ff" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          {showHistoryModal && (
            <div style={{ marginTop: 16, maxHeight: 400, overflowY: 'auto' }}>
              {payments.length === 0 ? <p style={{ color: '#777', fontSize: 13 }}>Платежей пока нет</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {payments.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', fontSize: 13 }}>
                      <div>
                        <div style={{ color: '#fff', fontWeight: 500 }}>
                          {p.payment_type === 'topup' ? `Пополнение: +${p.karma_amount} кармиков` : `Смена тарифа: ${p.tariff_code}`}
                        </div>
                        <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{new Date(p.created_at).toLocaleString('ru')}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#4ade80', fontWeight: 700 }}>{Number(p.amount_rub).toLocaleString('ru')} ₽</div>
                        <div style={{ color: p.status === 'succeeded' ? '#4ade80' : '#f97316', fontSize: 11, marginTop: 2 }}>{p.status === 'succeeded' ? 'Оплачено' : 'Ожидает'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Модалка сотрудников */}
        {showEmployeesModal && (
          <div className="modal-overlay" onClick={() => setShowEmployeesModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, background: 'linear-gradient(135deg, #c084fc, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>Кармики сотрудников</h3>
                <button onClick={() => setShowEmployeesModal(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ marginBottom: 16, position: 'relative' }}>
                <input type="text" placeholder="Поиск по имени…" value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} className="input-field" style={{ paddingLeft: 40 }} />
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                  <circle cx="7" cy="7" r="5" stroke="#a0e9ff" strokeWidth="1.4" />
                  <path d="M11 11l3 3" stroke="#a0e9ff" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
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

        {/* Модалка тарифа */}
        {showTariffModal && tariff && (
          <div className="modal-overlay" onClick={() => setShowTariffModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, background: 'linear-gradient(135deg, #a0e9ff, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>Тариф «{tariff.name}»</h3>
                <button onClick={() => setShowTariffModal(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>Эмиссия</div>
                <div style={{ fontSize: 18, color: '#fff', fontWeight: 600 }}>{tariff.karma_per_employee} кармиков на сотрудника в месяц</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>Стоимость</div>
                <div style={{ fontSize: 22, color: '#FFD700', fontWeight: 700 }}>{tariff.price_per_employee_rub.toLocaleString('ru')} ₽/сотр./мес</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>Действует до</div>
                <div style={{ fontSize: 16, color: '#fff' }}>{validUntil}</div>
                {daysLeft !== null && <div style={{ fontSize: 13, color: daysLeft <= 7 ? '#f87171' : '#888', marginTop: 4 }}>осталось {daysLeft} дн.</div>}
              </div>
              <button onClick={() => { setShowTariffModal(false); handleExtend() }} className="btn-gold w-full">Продлить тариф</button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .glass-btn {
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,215,0,0.3);
          border-radius: 14px;
          padding: 14px 24px;
          color: #fff;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all .25s;
          position: relative;
          overflow: hidden;
        }
        .glass-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent 30%, rgba(255,215,0,0.08) 50%, transparent 70%);
          opacity: 0;
          transition: opacity .3s;
        }
        .glass-btn:hover::before { opacity: 1; }
        .glass-btn:hover {
          border-color: rgba(255,215,0,0.6);
          box-shadow: 0 0 20px rgba(255,215,0,0.25);
          transform: translateY(-2px);
        }
        .extend-btn {
          background: linear-gradient(135deg, rgba(255,215,0,0.15), rgba(212,175,55,0.08));
          border: 1px solid rgba(255,215,0,0.4);
          border-radius: 20px;
          padding: 6px 14px;
          color: #FFD700;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all .25s;
          position: relative;
          overflow: hidden;
        }
        .extend-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent);
          transform: translateX(-100%);
          animation: shimmer 2.5s infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .extend-btn:hover {
          border-color: #FFD700;
          box-shadow: 0 0 12px rgba(255,215,0,0.5);
        }
        .payment-animation-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: overlayFadeIn 0.3s ease-out;
        }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .payment-black-hole {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .payment-black-hole.success {
          background: radial-gradient(circle, rgba(255,215,0,0.3) 0%, rgba(255,180,0,0.15) 30%, transparent 60%);
          box-shadow: 0 0 60px rgba(255,215,0,0.5), 0 0 120px rgba(255,180,0,0.3);
          animation: blackHoleSuccess 2.5s ease-out;
        }
        .payment-black-hole.error {
          background: radial-gradient(circle, rgba(248,113,113,0.3) 0%, rgba(239,68,68,0.15) 30%, transparent 60%);
          box-shadow: 0 0 60px rgba(248,113,113,0.5);
          animation: blackHoleError 2s ease-out;
        }
        @keyframes blackHoleSuccess {
          0% { transform: scale(0.3); opacity: 0; }
          30% { transform: scale(1.2); opacity: 1; }
          50% { transform: scale(1); }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes blackHoleError {
          0% { transform: scale(0.3); opacity: 0; }
          20% { transform: scale(1.1); opacity: 1; }
          40% { transform: scale(0.95); }
          60% { transform: scale(1.05); }
          80% { transform: scale(1); }
          100% { transform: scale(1); opacity: 0; }
        }
        .payment-checkmark {
          animation: checkPop 0.4s ease-out 0.8s both;
        }
        @keyframes checkPop {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .payment-check-path {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: checkDraw 0.6s ease-out 1s forwards;
        }
        @keyframes checkDraw {
          to { stroke-dashoffset: 0; }
        }
        .payment-error-text {
          color: #f87171;
          font-size: 16px;
          font-weight: 600;
          text-align: center;
          animation: errorTextFade 2s ease-out;
        }
        @keyframes errorTextFade {
          0% { opacity: 0; transform: translateY(10px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
export default withAuth(ResourcesPage, { anyStaff: true })
