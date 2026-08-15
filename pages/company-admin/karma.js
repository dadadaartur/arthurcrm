import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import { withAuth } from '../../components/withAuth'

function CompanyKarma() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [emitting, setEmitting] = useState(false)
  const [emitMsg, setEmitMsg] = useState('')

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) { setError('Нет сессии'); setLoading(false); return }
    try {
      const res = await fetch('/api/company-admin/karma', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) setData(await res.json())
      else { const e = await res.json(); setError(e.error || 'Ошибка загрузки') }
    } catch (e) { setError('Сетевая ошибка') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleEmit = async () => {
    setEmitting(true); setEmitMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/central-bank/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
      })
      const result = await res.json()
      if (res.ok) {
        setEmitMsg(`Эмиссия выполнена: +${result.emitted} кармиков в казну. Остаток Центробанка: ${result.new_bank_balance}`)
        await load()
      } else {
        setEmitMsg('Ошибка: ' + (result.error || 'не удалось выполнить эмиссию'))
      }
    } catch (e) { setEmitMsg('Сетевая ошибка') }
    setEmitting(false)
  }

  if (loading) return <div className="flex justify-center items-center py-24"><Spinner /></div>
  if (error) return <div className="max-w-4xl mx-auto px-6 py-8"><p className="text-red-400">{error}</p></div>

  const { account, tariff, employees, circulation, central_bank, emissions } = data
  const fundBalance = account?.balance ?? 0
  const validUntil = account?.valid_until ? new Date(account.valid_until).toLocaleDateString('ru') : '—'

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/company-admin" className="text-gray-400 hover:text-white text-sm mb-6 inline-block">← Назад</Link>
      <h1 className="text-2xl font-bold mb-8" style={{ color: '#d4af37' }}>Казна компании</h1>

      {/* Центробанк */}
      <div className="premium-card mb-6" style={{ borderColor: 'rgba(212,175,55,0.4)' }}>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Кармический Центробанк</h3>
            <p className="text-xs text-gray-500">Регулятор эмиссии кармиков</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Капитал Центробанка</div>
            <div className="text-2xl font-bold" style={{ color: '#FFD700' }}>{central_bank?.balance ?? 0}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mt-4 text-sm">
          <div className="flex justify-between border-b border-gray-800 pb-2">
            <span className="text-gray-400">Стартовый капитал</span>
            <span className="text-white">{central_bank?.starting_capital ?? 0}</span>
          </div>
          <div className="flex justify-between border-b border-gray-800 pb-2">
            <span className="text-gray-400">Всего эмитировано</span>
            <span className="text-white">{central_bank?.total_issued ?? 0}</span>
          </div>
          <div className="flex justify-between border-b border-gray-800 pb-2">
            <span className="text-gray-400">Всего отработано (списано)</span>
            <span className="text-white">{central_bank?.total_utilized ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Эмиссия */}
      <div className="premium-card mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Эмиссия по тарифу</h3>
            <p className="text-xs text-gray-500">
              Центробанк перечислит в казну {tariff?.karma_per_employee ?? 0} кармиков за каждого сотрудника
              и спишет эту сумму из своего капитала.
            </p>
          </div>
          <button onClick={handleEmit} disabled={emitting} className="btn-gold" style={{ opacity: emitting ? 0.6 : 1 }}>
            {emitting ? 'Выполняем…' : 'Выполнить эмиссию'}
          </button>
        </div>
        {emitMsg && (
          <p className="text-sm mt-3" style={{ color: emitMsg.startsWith('Ошибка') ? '#f87171' : '#4ade80' }}>{emitMsg}</p>
        )}
      </div>

      {/* Главные цифры */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="premium-card text-center">
          <div className="text-sm text-gray-400 mb-1">Фонд компании</div>
          <div className="text-3xl font-bold" style={{ color: '#FFD700' }}>{fundBalance}</div>
          <div className="text-xs text-gray-500">кармиков доступно</div>
        </div>
        <div className="premium-card text-center">
          <div className="text-sm text-gray-400 mb-1">В обороте у сотрудников</div>
          <div className="text-3xl font-bold" style={{ color: '#c084fc' }}>{circulation}</div>
          <div className="text-xs text-gray-500">кармиков накоплено</div>
        </div>
        <div className="premium-card text-center">
          <div className="text-sm text-gray-400 mb-1">Тариф</div>
          <div className="text-2xl font-bold text-white">{tariff?.name || '—'}</div>
          <div className="text-xs text-gray-500">{tariff ? `${tariff.karma_per_employee} карм./сотр. в мес` : ''}</div>
        </div>
        <div className="premium-card text-center">
          <div className="text-sm text-gray-400 mb-1">Действует до</div>
          <div className="text-2xl font-bold text-white">{validUntil}</div>
          <div className="text-xs text-gray-500">окончание тарифа</div>
        </div>
      </div>

      {/* История эмиссий */}
      <div className="premium-card mb-6">
        <h3 className="text-lg font-semibold mb-3 text-white">История эмиссий компании</h3>
        {emissions.length === 0 ? (
          <p className="text-gray-500 text-sm">Эмиссий ещё не было — нажмите «Выполнить эмиссию»</p>
        ) : (
          <div className="space-y-2">
            {emissions.map(em => (
              <div key={em.id} className="flex justify-between items-center p-2 rounded bg-gray-800 text-sm">
                <span className="text-gray-300">{new Date(em.created_at).toLocaleString('ru')}</span>
                <span className="font-semibold" style={{ color: '#FFD700' }}>+{em.amount}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Кто сколько накопил */}
      <div className="premium-card">
        <h3 className="text-lg font-semibold mb-4 text-white">Кто сколько накопил</h3>
        {employees.length === 0 ? (
          <p className="text-gray-500 text-sm">Сотрудников пока нет</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {employees.map(e => (
              <div key={e.user_id} className="flex justify-between items-center p-2 rounded bg-gray-800">
                <span className="text-white text-sm">{e.name}</span>
                <span className="font-semibold text-sm" style={{ color: '#FFD700' }}>{e.balance} кармиков</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default withAuth(CompanyKarma, { anyStaff: true })
