import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/Spinner'
import BackArrow from '../../components/BackArrow'
import { withAuth } from '../../components/withAuth'

const goldBtn = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '10px 24px', color: '#fff', cursor: 'pointer', fontSize: 14, transition: 'all .25s' }

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
      const res = await fetch('/api/company-admin/karma', { headers: { Authorization: `Bearer ${session.access_token}` } })
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ companyId: data.account?.company_id })
      })
      const result = await res.json()
      if (res.ok) { setEmitMsg(`Эмиссия выполнена: +${result.emitted} кармиков в фонд компании.`); await load() }
      else setEmitMsg('Ошибка: ' + (result.error || 'не удалось выполнить эмиссию'))
    } catch (e) { setEmitMsg('Сетевая ошибка') }
    setEmitting(false)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}><Spinner /></div>
  if (error) return <div style={{ padding: '40px 32px', color: '#f87171' }}>{error}</div>
  const { account, tariff, employees, circulation, emissions } = data
  const fundBalance = account?.balance ?? 0
  const validUntil = account?.valid_until ? new Date(account.valid_until).toLocaleDateString('ru') : '—'

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Фонд компании" />

        <div style={{ background: 'rgba(15,20,35,0.8)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 18, padding: 24, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: '#fff', margin: 0 }}>Эмиссия по тарифу</h3>
            <p style={{ fontSize: 13, color: '#888', margin: '6px 0 0' }}>
              Центробанк перечислит {tariff?.karma_per_employee ?? 0} кармиков за каждого сотрудника в фонд компании.
            </p>
          </div>
          <button onClick={handleEmit} disabled={emitting} style={{ ...goldBtn, opacity: emitting ? 0.5 : 1 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255,215,0,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none' }}>
            {emitting ? 'Выполняем…' : 'Выполнить эмиссию'}
          </button>
        </div>
        {emitMsg && <p style={{ fontSize: 13, marginBottom: 20, color: emitMsg.startsWith('Ошибка') ? '#f87171' : '#4ade80' }}>{emitMsg}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { l: 'Фонд компании', v: fundBalance, c: '#FFD700', s: 'кармиков доступно' },
            { l: 'В обороте у сотрудников', v: circulation, c: '#c084fc', s: 'кармиков накоплено' },
            { l: 'Тариф', v: tariff?.name || '—', c: '#fff', s: tariff ? `${tariff.karma_per_employee} карм./сотр. в мес` : '' },
            { l: 'Действует до', v: validUntil, c: '#fff', s: 'окончание тарифа' },
          ].map((m, i) => (
            <div key={i} style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 20, textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>{m.l}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: m.c }}>{m.v}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{m.s}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 22, border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 14 }}>История эмиссий</h3>
            {emissions.length === 0 ? <p style={{ color: '#777', fontSize: 13 }}>Эмиссий ещё не было</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
                {emissions.map(em => (
                  <div key={em.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.03)', fontSize: 13 }}>
                    <span style={{ color: '#aaa' }}>{new Date(em.created_at).toLocaleString('ru')}</span>
                    <span style={{ color: '#FFD700', fontWeight: 700 }}>+{em.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ background: 'rgba(15,20,35,0.8)', borderRadius: 16, padding: 22, border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 14 }}>Кто сколько накопил</h3>
            {employees.length === 0 ? <p style={{ color: '#777', fontSize: 13 }}>Сотрудников пока нет</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
                {employees.map(e => (
                  <div key={e.user_id} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.03)', fontSize: 13 }}>
                    <span style={{ color: '#fff' }}>{e.name}</span>
                    <span style={{ color: '#FFD700', fontWeight: 700 }}>{e.balance} карм.</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
export default withAuth(CompanyKarma, { anyStaff: true })
