import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import PremiumModal from '../components/PremiumModal'
import Spinner from '../components/Spinner'

function getKarmikWord(n) { /* ... склонение ... */ }

const statusLabels = {
  new: 'Не активирован',
  pending: 'На согласовании',
  approved: 'Одобрен',
  rejected: 'Отклонён'
}

export default function MyPurchases() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [notification, setNotification] = useState({ show: false, message: '' })
  const [activationModal, setActivationModal] = useState({ show: false, purchase: null })
  const [activationDate, setActivationDate] = useState('')
  const [activationComment, setActivationComment] = useState('')
  const [filterType, setFilterType] = useState('all') // all, new, pending, approved, rejected
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      await loadPurchases(user.id)
    }
    init()
  }, [])

  async function loadPurchases(userId) {
    const { data } = await supabase
      .from('purchases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setPurchases(data || [])
    setLoading(false)
  }

  // ... функции активации ...

  if (loading) return <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>

  const filteredPurchases = filterType === 'all' ? purchases : purchases.filter(p => p.status === filterType)

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: 'Inter, sans-serif', color: '#fff', padding: '40px 20px', position: 'relative' }}>
      <Head><title>Мои покупки | Кармический банк</title></Head>
      {/* Звёзды и переливы */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#aaa', textDecoration: 'none', marginBottom: 24 }}>
          <span style={{ fontSize: 18 }}>←</span> Назад
        </Link>

        <h1 style={{ fontSize: 28, marginBottom: 32, background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Мои покупки</h1>

        {/* Фильтры */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {['all', 'new', 'pending', 'approved', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilterType(status)}
              style={{
                padding: '8px 18px',
                borderRadius: 20,
                border: '1px solid rgba(255,215,0,0.3)',
                background: filterType === status ? 'rgba(255,215,0,0.2)' : 'transparent',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 13,
                backdropFilter: 'blur(8px)'
              }}
            >
              {status === 'all' ? 'Все' : statusLabels[status]}
            </button>
          ))}
        </div>

        {filteredPurchases.length === 0 ? (
          <p style={{ color: '#aaa' }}>Нет покупок</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {filteredPurchases.map(p => {
              const word = getKarmikWord(p.cost)
              return (
                <div key={p.id} style={{
                  background: 'rgba(15, 20, 35, 0.8)', backdropFilter: 'blur(10px)', borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.1)', padding: 24,
                  display: 'flex', flexDirection: 'column'
                }}>
                  {/* Фото товара */}
                  {p.image_url && (
                    <img src={p.image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }} />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: '#aaa' }}>{new Date(p.created_at).toLocaleDateString('ru')}</span>
                    <span style={{
                      padding: '4px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: p.status === 'approved' ? 'rgba(0,200,100,0.2)' : p.status === 'pending' ? 'rgba(255,200,0,0.2)' : p.status === 'rejected' ? 'rgba(255,0,0,0.2)' : 'rgba(100,100,255,0.2)',
                      color: p.status === 'approved' ? '#0f0' : p.status === 'pending' ? '#FFD700' : p.status === 'rejected' ? '#f44' : '#aaf'
                    }}>
                      {statusLabels[p.status] || p.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{p.reward_name}</h3>
                  <p style={{ color: '#ccc', marginBottom: 12 }}>{p.cost} {word}</p>

                  {p.certificate_data && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,180,0,0.1))',
                      border: '1px solid rgba(255,215,0,0.5)', borderRadius: 16, padding: 16, marginTop: 12
                    }}>
                      <h4 style={{ fontSize: 16, color: '#FFD700', marginBottom: 8 }}>Сертификат</h4>
                      {p.certificate_data.valid_date && <p style={{ fontSize: 14 }}>Действителен: {p.certificate_data.valid_date === 'any' ? 'Любой день' : new Date(p.certificate_data.valid_date).toLocaleDateString('ru')}</p>}
                      {p.certificate_data.comment && <p style={{ fontSize: 14, marginTop: 8, color: '#ddd' }}>Комментарий: {p.certificate_data.comment}</p>}
                    </div>
                  )}

                  {p.status === 'new' && (
                    <button onClick={() => setActivationModal({ show: true, purchase: p })} style={{
                      marginTop: 16, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,215,0,0.25)', borderRadius: 14, padding: '10px 20px',
                      color: '#fff', cursor: 'pointer', fontSize: 14
                    }}>Активировать</button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {/* ... модалка активации, уведомления ... */}
      <style jsx global>{`
        @keyframes twinkle { ... }
        @keyframes breathe1 { ... }
        *::-webkit-scrollbar { width: 0; height: 0; }
        * { scrollbar-width: none; }
      `}</style>
    </div>
  )
}
