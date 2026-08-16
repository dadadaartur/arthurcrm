import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'

const TYPE_LABELS = {
  emission: 'Эмиссия', topup: 'Оплата (ЮKassa)', utilization: 'Списание (магазин)',
  tariff_change: 'Смена тарифа', purchase: 'Покупка', transfer: 'Перевод',
  task_reward: 'Награда за задание', transaction: 'Операция'
}

export default function Movements() {
  const [access, setAccess] = useState('checking')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'arturgalkin.ru@mail.ru') { setAccess('denied'); setLoading(false); return }
    setAccess('granted')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/central-bank/movements', { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (res.ok) setRows(await res.json())
    setLoading(false)
  }

  if (loading) return <div className="flex justify-center items-center py-24"><Spinner /></div>
  if (access === 'denied') return (
    <div className="max-w-2xl mx-auto px-8 py-24"><div className="premium-card text-center">
      <h1 className="text-2xl font-bold text-red-400">Доступ запрещён</h1>
    </div></div>
  )

  const color = r => r.sign === '-' ? '#f87171' : r.sign === '+' ? '#4ade80' : '#a0e9ff'

  return (
    <div style={{ width: '100%', padding: '40px 32px', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <div className="flex items-center gap-4 mb-8">
          <Link href="/central-bank" className="flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,215,0,0.3)', textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontSize: 20, background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>←</span>
          </Link>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#d4af37' }}>Все движения кармиков</h1>
            <p className="text-sm text-gray-400 mt-1">Полная лента операций от всех сотрудников всех компаний</p>
          </div>
        </div>

        <div className="premium-card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-gray-400 border-b border-gray-700">
              <tr>
                <th className="py-3 pr-4">Время</th>
                <th className="py-3 pr-4">Тип</th>
                <th className="py-3 pr-4">Компания</th>
                <th className="py-3 pr-4">Сотрудник</th>
                <th className="py-3 pr-4">Описание</th>
                <th className="py-3 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-gray-800 hover:bg-white/[0.02]">
                  <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">{new Date(r.at).toLocaleString('ru')}</td>
                  <td className="py-2 pr-4"><span className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: '#ccc' }}>{TYPE_LABELS[r.type] || r.type}</span></td>
                  <td className="py-2 pr-4 text-gray-300">{r.company || '—'}</td>
                  <td className="py-2 pr-4 text-gray-300">{r.user || '—'}</td>
                  <td className="py-2 pr-4 text-gray-200">{r.title}</td>
                  <td className="py-2 text-right font-semibold whitespace-nowrap" style={{ color: color(r) }}>{r.sign}{r.amount}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-500">Движений пока нет</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
