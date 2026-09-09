import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell'
import { supabase } from '../../lib/supabaseClient'
import { useProfile } from '../../context/ProfileContext'
import { useFeedback } from '../../context/ActionFeedbackContext'

export default function AppShop() {
  const { user, profile } = useProfile()
  const { showSuccess, showError } = useFeedback()
  const [rewards, setRewards] = useState([])
  const [purchaseCounts, setPurchaseCounts] = useState({})
  const [balance, setBalance] = useState(0)
  const [confirmReward, setConfirmReward] = useState(null)
  const [buying, setBuying] = useState(false)

  useEffect(() => {
    if (!user || !profile?.company_id) return
    load()
  }, [user, profile])

  const load = async () => {
    // reward_id как имя колонки нигде в проекте не встречается напрямую
    // (только через PostgREST-эмбеддинг rewards(...)) — считаю через
    // сам эмбеддинг, а не гадаю точное имя колонки для .eq().
    const [{ data: bal }, { data: rew }, { data: purchases }] = await Promise.all([
      supabase.from('karma_balance').select('balance').eq('user_id', user.id).maybeSingle(),
      supabase.from('rewards').select('*').eq('company_id', profile.company_id).order('cost'),
      supabase.from('purchases').select('rewards(id)').eq('user_id', user.id),
    ])
    setBalance(bal?.balance || 0)
    setRewards(rew || [])
    const counts = {}
    ;(purchases || []).forEach(p => { const id = p.rewards?.id; if (id) counts[id] = (counts[id] || 0) + 1 })
    setPurchaseCounts(counts)
  }

  const confirmBuy = async () => {
    const reward = confirmReward
    if (!reward) return
    setBuying(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ rewardId: reward.id })
      })
      let d
      try { d = await r.json() } catch { d = {} }
      if (!r.ok) { showError(d.error || `Не удалось купить (код ${r.status})`); setBuying(false); setConfirmReward(null); return }
      showSuccess('Покупка совершена!')
      setConfirmReward(null)
      load()
    } catch (e) {
      showError('Сетевая ошибка: ' + (e?.message || 'не удалось связаться с сервером'))
    }
    setBuying(false)
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
            const bought = purchaseCounts[r.id] || 0
            const limitReached = r.limit_per_user && bought >= r.limit_per_user
            const canAfford = balance >= r.cost
            return (
              <div key={r.id} style={{ display: 'flex', gap: 12, borderRadius: 16, padding: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${limitReached ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.08)'}`, opacity: limitReached ? 0.75 : 1 }}>
                {r.image_url && <img src={r.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0, filter: limitReached ? 'grayscale(0.5)' : 'none' }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.description}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#FFD700' }}>{r.cost} к.</span>
                    {limitReached ? (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '7px 14px', borderRadius: 10, background: 'rgba(74,222,128,0.12)', color: '#4ade80', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                        Уже куплено
                      </span>
                    ) : (
                      <button onClick={() => setConfirmReward(r)} disabled={!canAfford}
                        style={{ fontSize: 11, fontWeight: 600, padding: '7px 14px', borderRadius: 10, background: canAfford ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${canAfford ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.1)'}`, color: canAfford ? '#FFD700' : '#666' }}>
                        Купить
                      </button>
                    )}
                  </div>
                  {r.limit_per_user > 0 && !limitReached && (
                    <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>Лимит: {bought}/{r.limit_per_user}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Кастомное подтверждение вместо системного confirm() */}
      {confirmReward && (
        <div onClick={() => !buying && setConfirmReward(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 320, borderRadius: 20, padding: 24, background: '#151a2e', border: '1px solid rgba(255,215,0,0.3)', textAlign: 'center' }}>
            {confirmReward.image_url && <img src={confirmReward.image_url} alt="" style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', margin: '0 auto 14px' }} />}
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 6 }}>{confirmReward.name}</div>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 18 }}>Купить за <span style={{ color: '#FFD700', fontWeight: 700 }}>{confirmReward.cost} кармиков</span>?</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmReward(null)} disabled={buying} style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ccc', fontSize: 13 }}>Отмена</button>
              <button onClick={confirmBuy} disabled={buying} style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: 'linear-gradient(135deg, #FFD700, #f0b900)', border: 'none', color: '#0a0e1c', fontWeight: 700, fontSize: 13, opacity: buying ? 0.6 : 1 }}>
                {buying ? 'Покупаем...' : 'Купить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
