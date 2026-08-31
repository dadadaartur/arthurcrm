import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell'
import PaymentSeal from '../../components/PaymentSeal'
import { supabase } from '../../lib/supabaseClient'
import { useProfile } from '../../context/ProfileContext'
import { useFeedback } from '../../context/ActionFeedbackContext'

// Перевод кармиков внутри мобильного приложения — раньше кнопка «Перевести
// коллеге» на главной вела на десктопную /transfer, которую тут же
// перехватывал блокировщик маленьких экранов, и перевод был физически
// недостижим с телефона.
export default function AppTransfer() {
  const { user } = useProfile()
  const { showError } = useFeedback()
  const [balance, setBalance] = useState(0)
  const [colleagues, setColleagues] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [amount, setAmount] = useState('')
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [seal, setSeal] = useState(null)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data: bal } = await supabase.from('karma_balance').select('balance').eq('user_id', user.id).maybeSingle()
      setBalance(bal?.balance || 0)
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (profile?.company_id) {
        const { data: cols } = await supabase.from('profiles')
          .select('user_id, display_name, first_name, last_name, email, avatar_url')
          .eq('company_id', profile.company_id).is('deleted_at', null).neq('user_id', user.id)
          .order('first_name', { ascending: true })
        setColleagues(cols || [])
      }
    }
    load()
  }, [user])

  const name = (c) => [c.first_name, c.last_name].filter(Boolean).join(' ') || c.display_name || c.email
  const filtered = colleagues.filter(c => name(c).toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()))

  const send = async () => {
    const amt = parseInt(amount, 10)
    if (!selected || !Number.isInteger(amt) || amt <= 0) { showError('Выберите коллегу и укажите сумму'); return }
    if (amt > balance) { showError('Недостаточно кармиков'); return }
    setSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ recipientId: selected.user_id, amount: amt, comment })
      })
      const result = await res.json()
      if (!res.ok) { showError(result.error || 'Ошибка перевода'); setSending(false); return }
      setBalance(result.newBalance)
      setSeal({ amount: amt, name: name(selected) })
      setSelected(null); setAmount(''); setComment(''); setSearch('')
    } catch (e) {
      showError('Сетевая ошибка: ' + (e?.message || 'не удалось связаться с сервером'))
    }
    setSending(false)
  }

  return (
    <>
    <AppShell title="Перевод коллеге" active="transfer">
      <div style={{ borderRadius: 14, padding: '10px 14px', background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#aaa' }}>Ваш баланс</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#FFD700' }}>{balance} кармиков</span>
      </div>

      <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Кому</label>
      {selected ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: 'rgba(160,233,255,0.06)', border: '1px solid rgba(160,233,255,0.3)', marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(160,233,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#a0e9ff', flexShrink: 0, overflow: 'hidden' }}>
            {selected.avatar_url ? <img src={selected.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name(selected).charAt(0).toUpperCase()}
          </div>
          <span style={{ flex: 1, fontSize: 13, color: '#fff' }}>{name(selected)}</span>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#888' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      ) : (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Начните вводить имя..."
            style={{ width: '100%', padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }} />
          <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 14 }}>
            {filtered.map(c => (
              <button key={c.user_id} onClick={() => { setSelected(c); setSearch('') }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 12, background: 'none', border: 'none', color: '#fff', textAlign: 'left' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,215,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#FFD700', flexShrink: 0, overflow: 'hidden' }}>
                  {c.avatar_url ? <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name(c).charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 13 }}>{name(c)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Сумма</label>
      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
        style={{ width: '100%', padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 12, boxSizing: 'border-box' }} />

      <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Комментарий (необязательно)</label>
      <input value={comment} onChange={e => setComment(e.target.value)} placeholder="За помощь с отчётом"
        style={{ width: '100%', padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, marginBottom: 18, boxSizing: 'border-box' }} />

      <button onClick={send} disabled={sending || !selected}
        style={{ width: '100%', padding: '14px 0', borderRadius: 14, background: 'linear-gradient(135deg, #FFD700, #f0b900)', border: 'none', color: '#0a0e1c', fontWeight: 700, fontSize: 15, opacity: sending || !selected ? 0.5 : 1 }}>
        {sending ? 'Отправка...' : 'Отправить'}
      </button>
    </AppShell>
    {seal && <PaymentSeal mode="success" amount={seal.amount} label={`кармиков отправлено · ${seal.name}`} onDone={() => setSeal(null)} />}
    </>
  )
}
