import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'

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

  if (loading) return <LoadingScreen />
  if (access === 'denied') return (
    <div className="theme-light max-w-2xl mx-auto px-8 py-24"><div className="premium-card text-center">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--accent-red)' }}>Доступ запрещён</h1>
    </div></div>
  )

  const color = r => r.sign === '-' ? '#dc2626' : r.sign === '+' ? '#137a39' : '#0e7490'

  return (
    <div className="theme-light" style={{ width: '100%', padding: '40px 32px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <div className="flex items-center gap-4 mb-8">
          <Link href="/central-bank" className="flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,215,0,0.3)', textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontSize: 20, background: 'linear-gradient(135deg, #0e7490, #db2777)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>←</span>
          </Link>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--accent-gold)' }}>Все движения кармиков</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Полная лента операций от всех сотрудников всех компаний</p>
          </div>
        </div>

        <div className="premium-card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
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
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{new Date(r.at).toLocaleString('ru')}</td>
                  <td className="py-2 pr-4"><span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}>{TYPE_LABELS[r.type] || r.type}</span></td>
                  <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{r.company || '—'}</td>
                  <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{r.user || '—'}</td>
                  <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{r.title}</td>
                  <td className="py-2 text-right font-semibold whitespace-nowrap" style={{ color: color(r) }}>{r.sign}{r.amount}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>Движений пока нет</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
