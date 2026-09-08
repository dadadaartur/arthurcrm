import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import LoadingScreen from '../components/LoadingScreen'

export default function CentralBank() {
  const [access, setAccess] = useState('checking')
  const [bank, setBank] = useState(null)
  const [companies, setCompanies] = useState([])
  const [tariffs, setTariffs] = useState([])
  const [ledger, setLedger] = useState([])
  const [payments, setPayments] = useState([])
  const [revenue, setRevenue] = useState({ byTariff: {}, topup: 0, total: 0 })
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(true)
  const [emittingId, setEmittingId] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'arturgalkin.ru@mail.ru') {
      setAccess('denied'); setLoading(false); return
    }
    setAccess('granted')
    await fetchAll()
  }

  const fetchAll = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/central-bank/dashboard', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    if (res.ok) {
      const d = await res.json()
      setBank(d.bank); setCompanies(d.companies); setTariffs(d.tariffs)
      setLedger(d.ledger); setPayments(d.payments || [])
      setRevenue(d.revenue || { byTariff: {}, topup: 0, total: 0 })
      setUpcoming(d.upcomingRenewals || [])
    } else {
      const e = await res.json().catch(() => ({}))
      setMessage('Ошибка загрузки: ' + (e.error || res.status))
    }
    setLoading(false)
  }

  const handleEmit = async (companyId) => {
    setEmittingId(companyId); setMessage('')
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/central-bank/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ companyId })
      })
      const result = await res.json()
      if (res.ok) {
        setMessage(`Эмиссия: +${result.emitted} кармиков компании. Остаток ЦБ: ${result.new_bank_balance}`)
        await fetchAll()
      } else {
        setMessage('Ошибка: ' + (result.error || ''))
      }
    } catch (e) { setMessage('Сетевая ошибка') }
    setEmittingId(null)
  }

  if (loading) return <LoadingScreen />

  if (access === 'denied') {
    return (
      <div className="theme-light max-w-2xl mx-auto px-8 py-24">
        <div className="premium-card text-center">
          <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--accent-red)' }}>Доступ запрещён</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Центробанк доступен только основателю платформы.</p>
        </div>
      </div>
    )
  }

  const tariffMap = Object.fromEntries(tariffs.map(t => [t.id, t]))

  return (
    <div className="theme-light" style={{ width: '100%', padding: '40px 32px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,215,0,0.3)', textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontSize: 20, background: 'linear-gradient(135deg, #0e7490, #db2777)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>←</span>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold" style={{ color: 'var(--accent-gold)' }}>Кармический Центробанк</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Регулятор эмиссии · учёт оплат · доступ: только основатель</p>
          </div>
          <Link href="/central-bank/movements" className="text-sm px-4 py-2"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-gold)', color: 'var(--accent-gold)', borderRadius: 10, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Все движения кармиков →
          </Link>
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-xl" style={{
            background: message.startsWith('Ошибка') ? 'rgba(220,38,38,0.06)' : 'rgba(19,122,57,0.06)',
            border: `1px solid ${message.startsWith('Ошибка') ? 'rgba(220,38,38,0.3)' : 'rgba(19,122,57,0.3)'}`,
            color: message.startsWith('Ошибка') ? '#dc2626' : '#137a39'
          }}>{message}</div>
        )}

        {/* Капитал */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="premium-card">
            <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Текущий капитал</div>
            <div className="text-3xl font-bold" style={{ color: 'var(--accent-gold)' }}>{bank?.balance ?? 0}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>кармиков в резерве</div>
          </div>
          <div className="premium-card">
            <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Стартовый капитал</div>
            <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{bank?.starting_capital ?? 0}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>изначальная эмиссия</div>
          </div>
          <div className="premium-card">
            <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Всего эмитировано</div>
            <div className="text-3xl font-bold" style={{ color: '#7c3aed' }}>{bank?.total_issued ?? 0}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>за всё время</div>
          </div>
          <div className="premium-card">
            <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Выручка (рубли)</div>
            <div className="text-3xl font-bold" style={{ color: '#137a39' }}>{(revenue.total || 0).toLocaleString('ru')} ₽</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>реальные оплаты</div>
          </div>
        </div>

        {/* Выручка по тарифам */}
        <div className="premium-card mb-8">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Выручка по тарифам и докупкам</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {tariffs.map(t => (
              <div key={t.id} className="p-4 rounded-lg ">
                <div className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Тариф «{t.name}»</div>
                <div className="text-xl font-bold" style={{ color: 'var(--accent-gold)' }}>
                  {(revenue.byTariff[t.code] || 0).toLocaleString('ru')} ₽
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t.price_per_employee_rub} ₽/сотр./мес</div>
              </div>
            ))}
            <div className="p-4 rounded-lg ">
              <div className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Докупки кармиков</div>
              <div className="text-xl font-bold" style={{ color: '#0e7490' }}>{(revenue.topup || 0).toLocaleString('ru')} ₽</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>пополнения фонда</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Ближайшие платежи */}
          <div className="premium-card">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Ближайшие продления подписок</h3>
            {upcoming.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Нет активных подписок</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {upcoming.map(r => (
                  <div key={r.company_id} className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'var(--bg-page)' }}>
                    <div>
                      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{r.company_name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Тариф «{r.tariff_name}» · {r.employee_count} сотр.</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold" style={{
                        color: r.days_left < 0 ? '#dc2626' : r.days_left <= 7 ? '#dc2626' : r.days_left <= 14 ? '#8a6208' : '#137a39'
                      }}>
                        {r.days_left < 0 ? 'просрочено' : `через ${r.days_left} дн.`}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(r.valid_until).toLocaleDateString('ru')} · ~{r.expected_rub.toLocaleString('ru')} ₽
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* История реальных оплат */}
          <div className="premium-card">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>История реальных оплат (ЮKassa)</h3>
            {payments.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Платежей пока нет</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {payments.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'var(--bg-page)' }}>
                    <div>
                      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{p.company_name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {p.payment_type === 'topup' ? 'Докупка кармиков' : `Смена тарифа (${p.tariff_code})`}
                        {p.paid_at ? ` · ${new Date(p.paid_at).toLocaleString('ru')}` : ''}
                      </div>
                    </div>
                    <div className="text-sm font-semibold" style={{ color: '#137a39' }}>
                      +{Number(p.amount_rub).toLocaleString('ru')} ₽
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Компании */}
        <div className="premium-card mb-8">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Все компании ({companies.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <tr>
                  <th className="py-3 pr-4 font-medium">Компания</th>
                  <th className="py-3 pr-4 font-medium">Сотр.</th>
                  <th className="py-3 pr-4 font-medium">Тариф</th>
                  <th className="py-3 pr-4 font-medium">Казна</th>
                  <th className="py-3 pr-4 font-medium">Эмиссия по тарифу</th>
                  <th className="py-3 pr-4 font-medium">Действует до</th>
                  <th className="py-3 font-medium text-right">Действие</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(c => {
                  const tariff = c.tariff_id ? tariffMap[c.tariff_id] : null
                  const expected = tariff ? tariff.karma_per_employee * Math.max(c.employee_count, 1) : 0
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="py-3 pr-4">
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ID: {c.id} · {c.status}</div>
                      </td>
                      <td className="py-3 pr-4" style={{ color: 'var(--text-primary)' }}>{c.employee_count}</td>
                      <td className="py-3 pr-4">
                        {tariff ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs" style={{
                            background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)'
                          }}>{tariff.name}</span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>не выбран</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-semibold" style={{ color: 'var(--accent-gold)' }}>{c.balance}</span>
                        <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>карм.</span>
                      </td>
                      <td className="py-3 pr-4" style={{ color: 'var(--text-primary)' }}>{tariff ? `+${expected}` : '—'}</td>
                      <td className="py-3 pr-4" style={{ color: 'var(--text-secondary)' }}>{c.valid_until ? new Date(c.valid_until).toLocaleDateString('ru') : '—'}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleEmit(c.id)}
                          disabled={emittingId === c.id || !tariff}
                          className="text-xs px-4 py-1.5"
                          style={{
                            background: 'linear-gradient(135deg, rgba(138,98,8,0.14), rgba(212,175,55,0.08))',
                            border: '1px solid var(--border-gold)',
                            color: '#8a6208',
                            borderRadius: 8,
                            cursor: 'pointer',
                            opacity: (!tariff || emittingId === c.id) ? 0.5 : 1
                          }}>
                          {emittingId === c.id ? 'Эмиссия...' : 'Эмитировать'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {companies.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>Компаний пока нет</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Журнал */}
        <div className="premium-card">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Журнал операций Центробанка</h2>
          {ledger.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Операций ещё не было</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {ledger.map(e => (
                <div key={e.id} className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'var(--bg-page)' }}>
                  <div>
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{e.description}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {new Date(e.created_at).toLocaleString('ru')} · компания ID {e.company_id}
                    </div>
                  </div>
                  <span className="font-semibold" style={{ color: e.amount > 0 ? '#137a39' : '#8a6208' }}>
                    {e.amount > 0 ? `+${e.amount}` : e.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
