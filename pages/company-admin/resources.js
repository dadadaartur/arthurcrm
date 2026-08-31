import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import DateRangePicker from '../../components/DateRangePicker'
import { withAuth } from '../../components/withAuth'

const TOPUP_RATE = { rub: 1000, karma: 100 }
const card = { background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 22, border: '1px solid var(--border-subtle)', position: 'relative' }
// Пилюля в стиле бейджа типа товара «Сертификат»
const pillBtn = { padding: '4px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: 'rgba(184,134,11,0.1)', border: '1px solid var(--border-gold)', color: '#8a6208', cursor: 'pointer', transition: 'all .2s' }
const ghostBtn = { background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12, padding: '10px 22px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#8a6208'; e.currentTarget.style.boxShadow = '0 0 14px rgba(138,98,8,0.18)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.boxShadow = 'none' }
const hoverPill = (e, on) => { e.currentTarget.style.background = on ? 'rgba(184,134,11,0.18)' : 'rgba(184,134,11,0.1)'; e.currentTarget.style.borderColor = on ? '#8a6208' : 'var(--border-gold)' }
const Chevron = ({ color }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position: 'absolute', top: 20, right: 20, opacity: 0.5 }}>
    <path d="M5 2l5 5-5 5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

import PaymentSeal from '../../components/PaymentSeal'

function CompanyResources() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showEmployeesModal, setShowEmployeesModal] = useState(false)
  const [showTariffModal, setShowTariffModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showTopupModal, setShowTopupModal] = useState(false)
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [histRange, setHistRange] = useState({ from: '', to: '' })
  const [topupKarma, setTopupKarma] = useState(0)
  const [hole, setHole] = useState(null)
  const holeShownRef = useRef(false)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) { setError('Нет сессии'); setLoading(false); return }
    try {
      const res = await fetch('/api/company-admin/resources', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (res.ok) setData(await res.json())
      else { const e = await res.json(); setError(e.error || 'Ошибка') }
    } catch (e) { setError('Сетевая ошибка') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Возврат с ЮKassa → анимация зачисления
  useEffect(() => {
    if (data && router.query.payment === 'success' && !holeShownRef.current) {
      holeShownRef.current = true
      const last = data.payments?.[0]
      setHole({ mode: 'success', amount: last?.karma_amount || last?.amount_rub || 0 })
      router.replace('/company-admin/resources', undefined, { shallow: true })
    }
  }, [data, router])

  const { account, tariff, employees, circulation, all_tariffs, payments } = data || {}
  const fundBalance = account?.balance ?? 0
  const validUntil = account?.valid_until ? new Date(account.valid_until).toLocaleDateString('ru') : '—'
  const daysLeft = account?.valid_until ? Math.ceil((new Date(account.valid_until) - new Date()) / 86400000) : null
  const employeesCount = employees?.length || 1
  const perEmp = Math.max(1, Math.round((tariff?.karma_per_employee || 100) * 0.2))
  const recommended = perEmp * employeesCount

  const openTopup = () => { setTopupKarma(recommended); setShowTopupModal(true) }

  const handleTopup = async (karma) => {
    if (!karma || karma <= 0) return
    setProcessing(true)
    const rub = Math.round((karma / TOPUP_RATE.karma) * TOPUP_RATE.rub)
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ amountRub: rub, karmaAmount: karma, paymentType: 'topup' })
      })
      const result = await res.json()
      if (res.ok && result.confirmation_url) { window.location.href = result.confirmation_url; return }
      setShowTopupModal(false)
      setHole({ mode: 'error', amount: karma, errorText: result.error || 'Не удалось создать платёж' })
    } catch (e) {
      setShowTopupModal(false)
      setHole({ mode: 'error', amount: karma, errorText: 'Сетевая ошибка' })
    }
    setProcessing(false)
  }

  const handleExtend = async () => {
    if (!tariff) return
    setProcessing(true)
    const rub = (tariff.code === 'ultra' ? 10000 : tariff.price_per_employee_rub) * employeesCount
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ amountRub: rub, karmaAmount: tariff.karma_per_employee * employeesCount, paymentType: 'tariff_upgrade', tariffCode: tariff.code })
      })
      const result = await res.json()
      if (res.ok && result.confirmation_url) { window.location.href = result.confirmation_url; return }
      setHole({ mode: 'error', amount: rub, errorText: result.error || 'Не удалось создать платёж' })
    } catch (e) { setHole({ mode: 'error', amount: rub, errorText: 'Сетевая ошибка' }) }
    setProcessing(false)
  }

  const handleChangeTariff = async (t) => {
    setProcessing(true)
    const rub = (t.code === 'ultra' ? 10000 : Number(t.price_per_employee_rub)) * employeesCount
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ amountRub: rub, karmaAmount: t.karma_per_employee * employeesCount, paymentType: 'tariff_upgrade', tariffCode: t.code })
      })
      const result = await res.json()
      if (res.ok && result.confirmation_url) { window.location.href = result.confirmation_url; return }
      setHole({ mode: 'error', amount: rub, errorText: result.error || '' })
    } catch (e) { setHole({ mode: 'error', amount: rub, errorText: 'Сетевая ошибка' }) }
    setProcessing(false)
  }

  if (loading) return <LoadingScreen />
  if (error) return <div style={{ padding: '40px 32px', color: '#dc2626' }}>{error}</div>

  const filteredEmployees = (employees || []).filter(e => !employeeSearch || e.name.toLowerCase().includes(employeeSearch.toLowerCase()))
  const filteredPayments = (payments || []).filter(p => {
    const d = (p.paid_at || p.created_at || '').slice(0, 10)
    if (histRange.from && d < histRange.from) return false
    if (histRange.to && d > histRange.to) return false
    return true
  })
  const topupRub = Math.round((topupKarma / TOPUP_RATE.karma) * TOPUP_RATE.rub)

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление ресурсами" extra={
          <button onClick={() => setShowHistoryModal(true)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'color .2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#8a6208'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" /><path d="M8 4.5V8l2.3 1.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
            История платежей
          </button>
        } />

        {hole && <PaymentSeal mode={hole.mode} amount={hole.amount} errorText={hole.errorText} onDone={() => { setHole(null); load() }} />}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
          {/* Фонд компании + Пополнить */}
          <div style={card}>
            <button onClick={openTopup} style={{ ...pillBtn, position: 'absolute', top: 14, right: 14 }}
              onMouseEnter={e => hoverPill(e, true)} onMouseLeave={e => hoverPill(e, false)}>Пополнить</button>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Фонд компании</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--accent-gold)' }}>{fundBalance}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>кармиков доступно</div>
          </div>

          {/* В обороте — стрелка в модалку */}
          <div onClick={() => setShowEmployeesModal(true)} style={{ ...card, cursor: 'pointer', transition: 'all .25s', border: '1px solid rgba(124,58,237,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}>
            <Chevron color="#7c3aed" />
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>В обороте у сотрудников</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#7c3aed' }}>{circulation}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>кармиков накоплено</div>
          </div>

          {/* Текущий тариф — стрелка в модалку */}
          <div onClick={() => setShowTariffModal(true)} style={{ ...card, cursor: 'pointer', transition: 'all .25s', border: '1px solid rgba(14,116,144,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0e7490'; e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(14,116,144,0.3)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}>
            <Chevron color="#0e7490" />
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Текущий тариф</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{tariff?.name || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{tariff ? `${tariff.karma_per_employee} карм./сотр./мес` : ''}</div>
          </div>

          {/* Действует до + Продлить */}
          <div style={card}>
            {tariff && (
              <button onClick={handleExtend} disabled={processing} style={{ ...pillBtn, position: 'absolute', top: 14, right: 14, opacity: processing ? 0.5 : 1 }}
                onMouseEnter={e => hoverPill(e, true)} onMouseLeave={e => hoverPill(e, false)}>Продлить</button>
            )}
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Действует до</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{validUntil}</div>
            <div style={{ fontSize: 12, color: daysLeft !== null && daysLeft <= 7 ? '#dc2626' : 'var(--text-muted)', marginTop: 4 }}>
              {daysLeft !== null ? `осталось ${daysLeft} дн.` : 'окончание тарифа'}
            </div>
          </div>
        </div>

        {/* Доступные тарифы */}
        <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 24, border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Доступные тарифы</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {(all_tariffs || []).map(t => {
              const isActive = tariff?.id === t.id
              const price = t.code === 'ultra' ? 10000 : t.price_per_employee_rub
              return (
                <div key={t.id} style={{ background: isActive ? 'rgba(184,134,11,0.06)' : 'var(--bg-page)', borderRadius: 14, padding: 18, border: `1px solid ${isActive ? 'var(--border-gold)' : 'var(--border-subtle)'}` }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{t.karma_per_employee} карм./сотр. в мес</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-gold)', marginBottom: 12 }}>{(price || 0).toLocaleString('ru')} ₽</div>
                  {!isActive && (
                    <button onClick={() => handleChangeTariff(t)} disabled={processing} style={{ ...ghostBtn, width: '100%', opacity: processing ? 0.5 : 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Перейти</button>
                  )}
                  {isActive && <div style={{ textAlign: 'center', fontSize: 12, color: '#137a39' }}>Активен</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* МОДАЛКА пополнения */}
      {showTopupModal && (
        <div className="modal-overlay" onClick={() => setShowTopupModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, background: 'linear-gradient(135deg, #8a6208, #0e7490)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Пополнить фонд</h3>
              <button onClick={() => setShowTopupModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
              Рекомендуем не менее 20% от тарифа «{tariff?.name}»: {perEmp} карм./сотр. × {employeesCount} сотр. = <b style={{ color: 'var(--accent-gold)' }}>{recommended}</b> кармиков.
            </p>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Сколько кармиков</label>
            <input type="number" min="1" value={topupKarma} onChange={e => setTopupKarma(parseInt(e.target.value) || 0)} className="input-field" style={{ width: '100%', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {[recommended, recommended * 2, recommended * 5].map(v => (
                <button key={v} onClick={() => setTopupKarma(v)} style={{ ...pillBtn, background: topupKarma === v ? 'rgba(138,98,8,0.18)' : pillBtn.background, borderColor: topupKarma === v ? '#8a6208' : pillBtn.borderColor }}>{v}</button>
              ))}
            </div>
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(184,134,11,0.06)', border: '1px solid var(--border-gold)', textAlign: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>К оплате: </span>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-gold)' }}>{topupRub.toLocaleString('ru')} ₽</span>
            </div>
            <button onClick={() => handleTopup(topupKarma)} disabled={processing || topupKarma <= 0} style={{ ...ghostBtn, width: '100%', opacity: processing || topupKarma <= 0 ? 0.5 : 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              {processing ? 'Создаём…' : 'Оплатить'}
            </button>
          </div>
        </div>
      )}

      {/* МОДАЛКА сотрудников */}
      {showEmployeesModal && (
        <div className="modal-overlay" onClick={() => setShowEmployeesModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, background: 'linear-gradient(135deg, #7c3aed, #8a6208)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Кармики сотрудников</h3>
              <button onClick={() => setShowEmployeesModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <input type="text" placeholder="Поиск по имени…" value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} className="input-field" style={{ paddingLeft: 40, width: '100%' }} />
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                <circle cx="7" cy="7" r="5" stroke="#0e7490" strokeWidth="1.4" /><path d="M11 11l3 3" stroke="#0e7490" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredEmployees.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Сотрудников не найдено</p> : (
                filteredEmployees.map(e => (
                  <div key={e.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, background: 'var(--bg-page)' }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>{e.name}</span>
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: 14 }}>{e.balance} карм.</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА тарифа */}
      {showTariffModal && tariff && (
        <div className="modal-overlay" onClick={() => setShowTariffModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, background: 'linear-gradient(135deg, #0e7490, #8a6208)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Тариф «{tariff.name}»</h3>
              <button onClick={() => setShowTariffModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div style={{ marginBottom: 14 }}><div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Эмиссия</div><div style={{ fontSize: 17, color: 'var(--text-primary)', fontWeight: 600 }}>{tariff.karma_per_employee} кармиков на сотрудника в месяц</div></div>
            <div style={{ marginBottom: 14 }}><div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Стоимость</div><div style={{ fontSize: 20, color: 'var(--accent-gold)', fontWeight: 700 }}>{(tariff.code === 'ultra' ? 10000 : tariff.price_per_employee_rub).toLocaleString('ru')} ₽/сотр./мес</div></div>
            <div style={{ marginBottom: 18 }}><div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Действует до</div><div style={{ fontSize: 15, color: 'var(--text-primary)' }}>{validUntil}{daysLeft !== null && <span style={{ fontSize: 12, color: daysLeft <= 7 ? '#dc2626' : 'var(--text-secondary)', marginLeft: 8 }}>осталось {daysLeft} дн.</span>}</div></div>
            <button onClick={() => { setShowTariffModal(false); handleExtend() }} style={{ ...ghostBtn, width: '100%' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Продлить тариф</button>
          </div>
        </div>
      )}

      {/* МОДАЛКА истории платежей */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, background: 'linear-gradient(135deg, #8a6208, #0e7490)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Движение средств компании</h3>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div style={{ marginBottom: 16 }}><DateRangePicker from={histRange.from} to={histRange.to} onChange={setHistRange} /></div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 6 }}>
              {filteredPayments.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Платежей за период нет</p> : (
                filteredPayments.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, background: 'var(--bg-page)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {p.payment_type === 'topup' ? (
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M4 8l4 4 4-4" stroke="#8a6208" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 14h10" stroke="#8a6208" strokeWidth="1.4" strokeLinecap="round" /></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="3.5" width="12" height="9" rx="2" stroke="#0e7490" strokeWidth="1.3" /><path d="M2 6.5h12" stroke="#0e7490" strokeWidth="1.3" /></svg>
                        )}
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>{p.payment_type === 'topup' ? `Пополнение фонда: +${p.karma_amount} кармиков` : `Смена тарифа: ${p.tariff_code}`}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>{new Date(p.paid_at || p.created_at).toLocaleString('ru')}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#137a39', fontWeight: 700, fontSize: 15 }}>{Number(p.amount_rub).toLocaleString('ru')} ₽</div>
                      <div style={{ fontSize: 11, marginTop: 2, color: p.status === 'succeeded' ? '#137a39' : p.status === 'canceled' ? '#dc2626' : '#8a6208' }}>{p.status === 'succeeded' ? 'Оплачено' : p.status === 'canceled' ? 'Отменён' : 'Ожидает'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default withAuth(CompanyResources, { anyStaff: true })
