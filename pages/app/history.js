import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell'
import { supabase } from '../../lib/supabaseClient'
import { useProfile } from '../../context/ProfileContext'

export default function AppHistory() {
  const { user } = useProfile()
  const [ops, setOps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [{ data: tx }, { data: tr }, { data: pr }] = await Promise.all([
        supabase.from('karma_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(40),
        supabase.from('transfers').select('*').or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(40),
        supabase.from('purchases').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(40),
      ])
      const all = [
        ...(tx || []).map(t => ({ ...t, kind: 'tx' })),
        ...(tr || []).map(t => ({ ...t, kind: 'transfer' })),
        ...(pr || []).map(t => ({ ...t, kind: 'purchase' })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 60)
      setOps(all)
      setLoading(false)
    }
    load()
  }, [user])

  return (
    <AppShell title="История операций" active="history">
      {loading ? (
        <p style={{ color: '#777', fontSize: 13 }}>Загрузка...</p>
      ) : ops.length === 0 ? (
        <p style={{ color: '#777', fontSize: 13, textAlign: 'center', marginTop: 40 }}>Операций пока нет</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ops.map(op => {
            const isTransferOut = op.kind === 'transfer' && op.from_user_id === user.id
            const positive = op.kind === 'transfer' ? !isTransferOut : op.kind === 'tx' ? op.amount >= 0 : false
            const amount = op.kind === 'purchase' ? -op.cost : op.amount
            const label = op.kind === 'transfer' ? (isTransferOut ? 'Исходящий перевод' : 'Входящий перевод')
              : op.kind === 'purchase' ? `Покупка: ${op.reward_name}`
              : op.description || 'Начисление'
            return (
              <div key={op.kind + op.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
                  <div style={{ fontSize: 10, color: '#777', marginTop: 2 }}>{new Date(op.created_at).toLocaleString('ru')}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: positive ? '#4ade80' : '#f87171', flexShrink: 0 }}>
                  {positive ? '+' : ''}{amount}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
