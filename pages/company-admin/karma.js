import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import { withAuth } from '../../components/withAuth'

// Курс докупки кармиков у Центробанка. Пока держим константой —
// позже вынесем в настройки, чтобы менять без правки кода.
const TOPUP_RATE = { rub: 1000, karma: 100 }

function CompanyKarma() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
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
    load()
  }, [])

  if (loading) return <div className="flex justify-center items-center py-24"><Spinner /></div>
  if (error) return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <p className="text-red-400">{error}</p>
    </div>
  )

  const { account, tariff, employees, circulation } = data
  const fundBalance = account?.balance ?? 0
  const validUntil = account?.valid_until ? new Date(account.valid_until).toLocaleDateString('ru') : '—'

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/company-admin" className="text-gray-400 hover:text-white text-sm mb-6 inline-block">← Назад</Link>
      <h1 className="text-2xl font-bold mb-8" style={{ color: '#d4af37' }}>Казна компании</h1>

      {!account && (
        <div className="premium-card mb-6 text-sm text-gray-400">
          Счёт компании в Центробанке ещё не создан. Обратитесь к администратору платформы.
        </div>
      )}

      {/* Главные цифры */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="premium-card text-center">
          <div className="text-sm text-gray-400 mb-1">Фонд компании</div>
          <div className="text-3xl font-bold" style={{ color: '#FFD700' }}>{fundBalance}</div>
          <div className="text-xs text-gray-500">кармиков доступно для начислений</div>
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

      {/* Условия тарифа */}
      <div className="premium-card mb-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Условия тарифа «{tariff?.name || '—'}»</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div className="flex justify-between border-b border-gray-800 pb-2">
            <span className="text-gray-400">Стоимость</span>
            <span className="text-white">{tariff?.price_per_employee_rub ?? '—'} ₽ за сотрудника/мес</span>
          </div>
          <div className="flex justify-between border-b border-gray-800 pb-2">
            <span className="text-gray-400">Начисление из Центробанка</span>
            <span className="text-white">{tariff?.karma_per_employee ?? '—'} кармиков на сотрудника/мес</span>
          </div>
          <div className="flex justify-between border-b border-gray-800 pb-2">
            <span className="text-gray-400">Лимит на свободные задания</span>
            <span className="text-white">до {tariff?.free_task_limit ?? '—'} кармиков/мес</span>
          </div>
          <div className="flex justify-between border-b border-gray-800 pb-2">
            <span className="text-gray-400">Курс докупки кармиков</span>
            <span className="text-white">{TOPUP_RATE.rub} ₽ = {TOPUP_RATE.karma} кармиков</span>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg text-xs text-gray-400" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <b className="text-gray-300">При окончании тарифа:</b> начисление новых кармиков из Центробанка останавливается,
          но уже накопленные кармики сотрудников сохраняются. Чтобы продолжить начисления — продлите тариф или докупите кармики.
        </div>
      </div>

      {/* Оборота и подсказка руководителю */}
      <div className="premium-card mb-6">
        <h3 className="text-lg font-semibold mb-3 text-white">Оборот кармиков</h3>
        <p className="text-sm text-gray-400 mb-2">
          Всего у сотрудников накоплено <span className="font-semibold" style={{ color: '#FFD700' }}>{circulation}</span> кармиков.
        </p>
        {circulation > 0 && (
          <p className="text-xs text-gray-500 leading-relaxed">
            Если сотрудники долго не тратят кармики — возможно, товары в магазине не интересны, либо все копят на что-то дорогое.
            Имеет смысл добавить более доступные востребованные товары, чтобы мягко стимулировать траты и вернуть кармики в оборот.
          </p>
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
