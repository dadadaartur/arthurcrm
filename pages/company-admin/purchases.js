import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import PremiumModal from '../../components/PremiumModal'
import { withAuth } from '../../components/withAuth'

function PurchasesAdmin() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [modal, setModal] = useState({ show: false, purchase: null })
  const [comment, setComment] = useState('')
  const [dateOption, setDateOption] = useState('any')
  const [specificDate, setSpecificDate] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('company_id, role_id').eq('user_id', user.id).single()
      if (!prof) { router.push('/'); return }
      setProfile(prof)
      loadPurchases(prof.company_id)
    }
    init()
  }, [router])

  const loadPurchases = async (companyId) => {
    const { data: employees } = await supabase.from('profiles').select('user_id').eq('company_id', companyId)
    if (!employees?.length) return setPurchases([])
    const userIds = employees.map(e => e.user_id)
    const { data } = await supabase.from('purchases').select('*').in('user_id', userIds).eq('status', 'pending').order('created_at', { ascending: false })
    setPurchases(data || [])
  }

  const handleApprove = async () => {
    const { purchase } = modal
    if (!purchase) return
    const updateData = {
      status: 'approved',
      approved_comment: comment,
      certificate_data: {
        valid_date: dateOption === 'any' ? 'any' : specificDate,
        comment: comment
      }
    }
    const { error } = await supabase.from('purchases').update(updateData).eq('id', purchase.id)
    if (!error) {
      await supabase.from('notifications').insert({
        user_id: purchase.user_id,
        message: `Ваша покупка "${purchase.reward_name}" одобрена! Подробности в разделе "Мои покупки".`,
        link: '/my-purchases'
      })
      setModal({ show: false })
      loadPurchases(profile.company_id)
    }
  }

  const handleReject = async () => {
    const { purchase } = modal
    if (!purchase) return
    await supabase.from('purchases').update({ status: 'rejected', approved_comment: comment }).eq('id', purchase.id)
    await supabase.from('notifications').insert({
      user_id: purchase.user_id,
      message: `Ваша покупка "${purchase.reward_name}" отклонена. Причина: ${comment || 'не указана'}.`,
      link: '/my-purchases'
    })
    setModal({ show: false })
    loadPurchases(profile.company_id)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 20px', position: 'relative' }}>
      {/* Звёзды */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        {Array.from({ length: 80 }).map((_, i) => {
          const size = Math.random() * 2 + 0.5
          const colors = ['#ffffff', '#ffe0d0', '#ffddaa', '#d0e0ff', '#ffffdd', '#ffe4c4']
          const color = colors[Math.floor(Math.random() * colors.length)]
          return (
            <div key={i} style={{
              position: 'absolute', left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
              width: size + 'px', height: size + 'px', borderRadius: '50%', background: color,
              boxShadow: `0 0 ${size * 2}px ${color}`,
              opacity: Math.random() * 0.5 + 0.3,
              animation: `twinkle ${Math.random() * 10 + 5}s ease-in-out infinite`,
              animationDelay: Math.random() * 10 + 's'
            }} />
          )
        })}
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto' }}>
        <Link href="/company-admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#aaa', textDecoration: 'none', marginBottom: 24 }}>
          <span style={{ fontSize: 18 }}>←</span> Назад
        </Link>

        <h1 style={{ fontSize: 28, marginBottom: 32, background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Подтверждение сертификатов</h1>

        {purchases.length === 0 ? <p style={{ color: '#aaa' }}>Нет запросов</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {purchases.map(p => (
              <div key={p.id} style={{
                background: 'rgba(20,25,45,0.9)', backdropFilter: 'blur(10px)',
                borderRadius: 16, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 18 }}>{p.reward_name}</div>
                  <div style={{ fontSize: 14, color: '#aaa' }}>Сотрудник: {p.user_id}</div>
                  <div style={{ fontSize: 14, color: '#FFD700' }}>{p.cost} кармиков</div>
                </div>
                <button onClick={() => { setModal({ show: true, purchase: p }); setComment(''); setDateOption('any'); setSpecificDate(''); }} style={{
                  background: 'linear-gradient(135deg, #f97316, #e65c00)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 10, cursor: 'pointer'
                }}>Рассмотреть</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно */}
      {modal.show && modal.purchase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setModal({ show: false })}>
          <div style={{ background: '#1a1f2f', borderRadius: 20, padding: 32, maxWidth: 500, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, marginBottom: 16, color: '#fff' }}>{modal.purchase.reward_name}</h3>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Комментарий" style={{ width: '100%', padding: 12, borderRadius: 10, background: '#111', border: '1px solid #333', color: '#fff', marginBottom: 16 }} rows={3} />
            <div style={{ marginBottom: 16 }}>
              <label style={{ marginRight: 16, color: '#fff' }}>
                <input type="radio" name="date" checked={dateOption === 'any'} onChange={() => setDateOption('any')} /> Любой день
              </label>
              <label style={{ color: '#fff' }}>
                <input type="radio" name="date" checked={dateOption === 'specific'} onChange={() => setDateOption('specific')} /> Конкретная дата
              </label>
              {dateOption === 'specific' && (
                <input type="date" value={specificDate} onChange={e => setSpecificDate(e.target.value)} style={{ marginLeft: 12, background: '#111', border: '1px solid #333', color: '#fff', padding: 8, borderRadius: 8 }} />
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleApprove} style={{ flex: 1, background: '#0f0', color: '#000', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>Одобрить</button>
              <button onClick={handleReject} style={{ flex: 1, background: '#f44', color: '#fff', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>Отклонить</button>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}

export default withAuth(PurchasesAdmin, [1, 2])
