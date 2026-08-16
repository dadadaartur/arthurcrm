import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import { withAuth } from '../../components/withAuth'

// Курс докупки кармиков у Центробанка. Позже вынесем в настройки.
const TOPUP_RATE = { rub: 1000, karma: 100 }

function CompanyResources() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [topupAmount, setTopupAmount] = useState(100)
  const [processing, setProcessing] = useState(false)
  const [paymentMsg, setPaymentMsg] = useState('')

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) { setError('Нет сессии'); setLoading(false); return }
    try {
      const res = await fetch('/api/company-admin/resources', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) setData(await res.json())
      else { const e = await res.json(); setError(e.error || 'Ошибка') }
    } catch (e) { setError('Сетевая ошибка') }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Обработка возврата с ЮKassa
    if (router.query.payment === 'success') {
      setPaymentMsg('Оплата завершена. Кармики будут зачислены в течение минуты.')
      router.replace('/company-admin/resources', undefined, { shallow: true })
    }
  }, [router.query])

  const handleTopup = async () => {
    if (!topupAmount || topupAmount <= 0) return
    setProcessing(true); setPaymentMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    const rub = Math.round((topupAmount / TOPUP_RATE.karma) * TOPUP_RATE.rub)
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          amountRub: rub,
          karmaAmount: topupAmount,
          paymentType: 'topup'
        })
      })
      const result = await res.json()
      if (res.ok && result.confirmation_url) {
        window.location.href = result.confirmation_url
      } else {
        setPaymentMsg('Ошибка: ' + (result.error || 'не удалось создать платёж'))
      }
    } catch (e) { setPaymentMsg('Сетевая ошибка') }
    setProcessing(false)
  }

  const handleChangeTariff = async (tariffCode) => {
    const tariff = data?.all_tariffs?.find(t => t.code === tariffCode)
    if (!tariff) return
    const employees = data?.employees?.length || 1
    const rub = Number(tariff.price_per_employee_rub) * employees
    setProcessing(true); setPaymentMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          amountRub: rub,
          karmaAmount: tariff.karma_per_employee * employees,
          paymentType: 'tariff_upgrade',
          tariffCode
        })
      })
      const result = await res.json()
      if (res.ok && result.confirmation_url) {
        window.location.href = result.confirmation_url
      } else {
        setPaymentMsg('Ошибка: ' + (result.error || ''))
      }
    } catch (e) { setPaymentMsg('Сетевая ошибка') }
    setProcessing(false)
  }

  if (loading) return <div className="flex justify-center items-center py-24"><Spinner /></div>
  if (error) return <div className="max-w-4xl mx-auto px-6 py-8"><p className="text-red-400">{error}</p></div>

  const { account, tariff, employees, circulation, all_tariffs, payments } = data
  const fundBalance = account?.balance ?? 0
  const validUntil = account?.valid_until ? new Date(account.valid_until).toLocaleDateString('ru') : '—'
  const topupRub = Math.round((topupAmount / TOPUP_RATE.karma) * TOPUP_RATE.rub)

  return (
    <div style={{ width: '100%', padding: '40px 32px', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        {/* Стрелка и заголовок на одной строке */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/company-admin" className="flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '1px solid rgba(255,215,0,0.3)', textDecoration: 'none', flexShrink: 0
            }}>
            <span style={{
              fontSize: 20,
              background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>←</span>
          </Link>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#d4af37' }}>Управление ресурсами</h1>
            <p className="text-sm text-gray-400 mt-1">Баланс компании, тариф и пополнение кармиков</p>
          </div>
        </div>

        {paymentMsg && (
          <div className="mb-6 p-4 rounded-xl" style={{
            background: paymentMsg.startsWith('Ошибка') ? 'rgba(244,67,54,0.1)' : 'rgba(74,222,128,0.1)',
            border: `1px solid ${paymentMsg.startsWith('Ошибка') ? 'rgba(244,67,54,0.3)' : 'rgba(74,222,128,0.3)'}`,
            color: paymentMsg.startsWith('Ошибка') ? '#f87171' : '#4ade80'
          }}>
            {paymentMsg}
          </div>
        )}

        {/* Ключевые показатели */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="premium-card">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Фонд компании</div>
            <div className="text-3xl font-bold" style={{ color: '#FFD700' }}>{fundBalance}</div>
            <div className="text-xs text-gray-500 mt-1">кармиков для начислений</div>
          </div>
          <div className="premium-card">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">В обороте у сотрудников</div>
            <div className="text-3xl font-bold" style={{ color: '#c084fc' }}>{circulation}</div>
            <div className="text-xs text-gray-500 mt-1">кармиков накоплено</div>
          </div>
          <div className="premium-card">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Текущий тариф</div>
            <div className="text-2xl font-bold text-white">{tariff?.name || '—'}</div>
            <div className="text-xs text-gray-500 mt-1">
              {tariff ? `${tariff.karma_per_employee} карм./сотр./мес` : ''}
            </div>
          </div>
          <div className="premium-card">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Действует до</div>
            <div className="text-2xl font-bold text-white">{validUntil}</div>
            <div className="text-xs text-gray-500 mt-1">окончание тарифа</div>
          </div>
        </div>

        {/* Условия тарифа + пополнение */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="premium-card">
            <h3 className="text-lg font-semibold mb-4 text-white">Условия вашего тарифа</h3>
            <div className="space-y-3">
              <div className="flex justify-between pb-2 border-b border-gray-800">
                <span className="text-gray-400">Стоимость</span>
                <span className="text-white font-medium">{tariff?.price_per_employee_rub ?? '—'} ₽ за сотрудника/мес</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-800">
                <span className="text-gray-400">Эмиссия из Центробанка</span>
                <span className="text-white font-medium">{tariff?.karma_per_employee ?? '—'} карм./сотр./мес</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-800">
                <span className="text-gray-400">Лимит на свободные задания</span>
                <span className="text-white font-medium">до {tariff?.free_task_limit ?? '—'} карм./мес</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-400">Курс докупки кармиков</span>
                <span className="text-white font-medium">{TOPUP_RATE.rub} ₽ = {TOPUP_RATE.karma} кармиков</span>
              </div>
            </div>
            <div className="mt-5 p-3 rounded-lg text-xs text-gray-400 leading-relaxed"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <b className="text-gray-300">При окончании тарифа:</b> начисление новых кармиков из Центробанка останавливается,
              но накопленные кармики сотрудников сохраняются. Продлите тариф или докупите кармики, чтобы продолжить работу.
            </div>
          </div>

          <div className="premium-card">
            <h3 className="text-lg font-semibold mb-4 text-white">Пополнить фонд кармиков</h3>
            <p className="text-sm text-gray-400 mb-4">
              Если кармики заканчиваются — докупите их у Центробанка по курсу {TOPUP_RATE.rub} ₽ за {TOPUP_RATE.karma} кармиков.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Количество кармиков</label>
                <input
                  type="number"
                  value={topupAmount}
                  onChange={e => setTopupAmount(parseInt(e.target.value) || 0)}
                  className="input-field w-full"
                  min="100"
                  step="100"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[100, 500, 1000, 5000].map(v => (
                  <button key={v} onClick={() => setTopupAmount(v)} className="text-xs px-3 py-1.5 rounded-full"
                    style={{
                      background: topupAmount === v ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${topupAmount === v ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      color: topupAmount === v ? '#FFD700' : '#aaa'
                    }}>
                    {v}
                  </button>
                ))}
              </div>
              <div className="p-3 rounded-lg text-center"
                style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)' }}>
                <span className="text-sm text-gray-400">К оплате: </span>
                <span className="text-xl font-bold" style={{ color: '#FFD700' }}>{topupRub.toLocaleString('ru')} ₽</span>
              </div>
              <button onClick={handleTopup} disabled={processing || topupAmount <= 0}
                className="btn-gold w-full py-3" style={{ opacity: (processing || topupAmount <= 0) ? 0.5 : 1 }}>
                {processing ? 'Создаём платёж...' : `Оплатить через ЮKassa`}
              </button>
              <p className="text-xs text-gray-500 text-center">
                Тестовая карта: 5555 5555 5555 4444, любой срок и CVV
              </p>
            </div>
          </div>
        </div>

        {/* Доступные тарифы для перехода */}
        <div className="premium-card mb-8">
          <h3 className="text-lg font-semibold mb-4 text-white">Доступные тарифы</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(all_tariffs || []).map(t => {
              const isCurrent = tariff?.code === t.code
              const employees = data?.employees?.length || 1
              const price = Number(t.price_per_employee_rub) * employees
              return (
                <div key={t.id} className="rounded-xl p-5 transition-all"
                  style={{
                    background: isCurrent ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isCurrent ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-white">{t.name}</h4>
                    {isCurrent && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80' }}>
                        текущий
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold mb-1" style={{ color: '#FFD700' }}>
                    {t.price_per_employee_rub} ₽
                    <span className="text-xs text-gray-500 font-normal"> /сотр./мес</span>
                  </div>
                  <div className="text-sm text-gray-400 mb-3">
                    {t.karma_per_employee} кармиков на сотрудника в месяц
                  </div>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">{t.description}</p>
                  {!isCurrent && (
                    <button
                      onClick={() => handleChangeTariff(t.code)}
                      disabled={processing}
                      className="w-full text-sm py-2 rounded-lg transition-colors"
                      style={{
                        background: 'rgba(255,215,0,0.1)',
                        border: '1px solid rgba(255,215,0,0.3)',
                        color: '#FFD700',
                        opacity: processing ? 0.5 : 1
                      }}>
                      Перейти · {price.toLocaleString('ru')} ₽
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* История платежей */}
        <div className="premium-card mb-8">
          <h3 className="text-lg font-semibold mb-4 text-white">История платежей</h3>
          {(payments || []).length === 0 ? (
            <p className="text-gray-500 text-sm">Платежей пока нет</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(payments || []).map(p => {
                const statusLabel = p.status === 'succeeded' ? '✓ оплачен'
                  : p.status === 'canceled' ? '✗ отменён'
                  : p.status === 'pending' ? '⏳ ожидание' : p.status
                const statusColor = p.status === 'succeeded' ? '#4ade80'
                  : p.status === 'canceled' ? '#f87171' : '#FFD700'
                return (
                  <div key={p.id} className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50">
                    <div>
                      <div className="text-sm text-white">
                        {p.payment_type === 'topup' ? 'Пополнение фонда' : 'Смена тарифа'}
                        {p.karma_amount ? ` · ${p.karma_amount} карм.` : ''}
                        {p.tariff_code ? ` · ${p.tariff_code}` : ''}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(p.created_at).toLocaleString('ru')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-white">{Number(p.amount_rub).toLocaleString('ru')} ₽</div>
                      <div className="text-xs" style={{ color: statusColor }}>{statusLabel}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Кто сколько накопил */}
        <div className="premium-card">
          <h3 className="text-lg font-semibold mb-4 text-white">Кто сколько накопил ({employees.length})</h3>
          {employees.length === 0 ? (
            <p className="text-gray-500 text-sm">Сотрудников пока нет</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-1">
              {employees.map(e => (
                <div key={e.user_id} className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50">
                  <span className="text-white text-sm truncate pr-2">{e.name}</span>
                  <span className="font-semibold text-sm whitespace-nowrap" style={{ color: '#FFD700' }}>
                    {e.balance} карм.
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

export default withAuth(CompanyResources, { anyStaff: true })
