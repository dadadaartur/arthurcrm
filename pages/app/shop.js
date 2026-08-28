import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell'
import { supabase } from '../../lib/supabaseClient'
import { useProfile } from '../../context/ProfileContext'
import { useFeedback } from '../../context/ActionFeedbackContext'

export default function AppShop() {
  const { user, profile } = useProfile()
  const { showSuccess, showError } = useFeedback()
  const [rewards, setRewards] = useState([])
  const [balance, setBalance] = useState(0)
  const [buying, setBuying] = useState(null)

  useEffect(() => {
    if (!user || !profile?.company_id) return
    load()
  }, [user, profile])

  const load = async () => {
    const [{ data: bal }, { data: rew }] = await Promise.all([
      supabase.from('karma_balance').select('balance').eq('user_id', user.id).maybeSingle(),
      supabase.from('rewards').select('*').eq('company_id', profile.company_id).order('cost'),
    ])
    setBalance(bal?.balance || 0)
    setRewards(rew || [])
  }

  const buy = async (reward) => {
    if (balance < reward.cost) { showError('Недостаточно кармиков'); return }
    if (!confirm(`Купить «${reward.name}» за ${reward.cost} кармиков?`)) return
    setBuying(reward.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ rewardId: reward.id })
      })
      const d = await r.json()
      if (!r.ok) { showError(d.error || 'Не удалось купить'); setBuying(null); return }
      showSuccess('Покупка совершена!')
      load()
    } catch (e) {
      showError(e.message)
    }
    setBuying(null)
  }

  return (
    <AppShell title="Магазин" active="shop">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)' }}>
        <span style={{ fontSize: 12, color: '#aaa' }}>Ваш баланс</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#FFD700' }}>{balance} кармиков</span>
      </div>

      {rewards.length === 0 ? (
        <p style={{ color: '#777', fontSize: 13, textAlign: 'center', marginTop: 40 }}>Товаров пока нет</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rewards.map(r => {
            const canAfford = balance >= r.cost
            return (
              <div key={r.id} style={{ display: 'flex', gap: 12, borderRadius: 16, padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {r.image_url && <img src={r.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.description}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#FFD700' }}>{r.cost} к.</span>
                    <button onClick={() => buy(r)} disabled={buying === r.id || !canAfford}
                      style={{ fontSize: 11, fontWeight: 600, padding: '7px 14px', borderRadius: 10, background: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${canAfford ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.1)'}`, color: canAfford ? '#FFD700' : '#666' }}>
                      {buying === r.id ? '...' : 'Купить'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
