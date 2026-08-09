import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import PremiumModal from '../components/PremiumModal'

function getKarmikWord(n) {
  const lastDigit = n % 10
  const lastTwoDigits = n % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'кармиков'
  if (lastDigit === 1) return 'кармик'
  if (lastDigit >= 2 && lastDigit <= 4) return 'кармика'
  return 'кармиков'
}

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
  const [filterType, setFilterType] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, deleted_at')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!profile?.company_id || profile.deleted_at) { router.push('/welcome'); return }

      setUser(user)
      await loadPurchases(user.id)
    }
    init()
  }, [])

  async function loadPurchases(userId) {
    const { data } = await supabase
      .from('purchases')
      .select('*, rewards ( image_url )')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    const enriched = (data || []).map(p => ({
      ...p,
      image_url: p.rewards?.image_url || null
    }))
    setPurchases(enriched)
    setLoading(false)
  }

  const handleActivate = async () => {
    const { purchase } = activationModal
    if (!purchase || !activationDate) return

    const { error } = await supabase
      .from('purchases')
      .update({
        status: 'pending',
        certificate_data: {
          valid_date: activationDate,
          comment: activationComment
        }
      })
      .eq('id', purchase.id)

    if (!error) {
      setNotification({ show: true, message: 'Сертификат отправлен на согласование!' })
      setActivationModal({ show: false })
      loadPurchases(user.id)

      const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (profile?.company_id) {
        // role_id — per-company значение, хардкодить [1,2] небезопасно и
        // некорректно (см. lib/auth.js). Уведомляем реальных ревьюеров:
        // админа компании и модераторов с правом can_review_tasks.
        const { data: admins } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('company_id', profile.company_id)
          .or('is_company_admin.eq.true,can_review_tasks.eq.true')
        if (admins?.length) {
          const notifs = admins.map(a => ({
            user_id: a.user_id,
            message: `Сотрудник хочет активировать "${purchase.reward_name}". Требуется подтверждение.`,
            link: '/company-admin/purchases'
          }))
          await supabase.from('notifications').insert(notifs)
        }
      }
    }
  }

  if (loading) return <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>

  const filteredPurchases = filterType === 'all' ? purchases : purchases.filter(p => p.status === filterType)

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: 'Inter, sans-serif', color: '#fff', padding: '20px', position: 'relative' }}>
      <Head><title>Мои покупки | Кармический банк</title></Head>
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
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 100%, rgba(255,100,50,0.5) 0%, rgba(255,100,50,0.2) 40%, transparent 75%)', animation: 'breathe1 12s ease-in-out infinite alternate' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, margin: '0 auto' }}>
        {/* Верхняя строка: Назад + заголовок */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 14, color: '#aaa', textDecoration: 'none',
            transition: 'color 0.2s'
          }}>
            <span style={{ fontSize: 18 }}>←</span> Назад
          </Link>
          <h1 style={{ fontSize: 28, margin: 0, background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Мои покупки
          </h1>
        </div>

        {/* Фильтры */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {['all', 'new', 'pending', 'approved', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilterType(status)}
              style={{
                padding: '6px 14px',
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 20,
            marginBottom: 40
          }}>
            {filteredPurchases.map(p => {
              const word = getKarmikWord(p.cost)
              return (
                <div key={p.id} style={{
                  background: 'rgba(15, 20, 35, 0.8)', backdropFilter: 'blur(10px)', borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.1)', padding: 20,
                  display: 'flex', flexDirection: 'column',
                  minHeight: 360
                }}>
                  {p.image_url && (
                    <img src={p.image_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }} />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#aaa' }}>{new Date(p.created_at).toLocaleDateString('ru')}</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                      background: p.status === 'approved' ? 'rgba(0,200,100,0.2)' : p.status === 'pending' ? 'rgba(255,200,0,0.2)' : p.status === 'rejected' ? 'rgba(255,0,0,0.2)' : 'rgba(100,100,255,0.2)',
                      color: p.status === 'approved' ? '#0f0' : p.status === 'pending' ? '#FFD700' : p.status === 'rejected' ? '#f44' : '#aaf'
                    }}>
                      {statusLabels[p.status] || p.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>{p.reward_name}</h3>
                  <p style={{ color: '#ccc', marginBottom: 10, fontSize: 13 }}>{p.cost} {word}</p>

                  {p.certificate_data && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,180,0,0.1))',
                      border: '1px solid rgba(255,215,0,0.5)', borderRadius: 12, padding: 12, marginTop: 'auto'
                    }}>
                      <h4 style={{ fontSize: 14, color: '#FFD700', marginBottom: 4 }}>Сертификат</h4>
                      {p.certificate_data.valid_date && <p style={{ fontSize: 12 }}>Действителен: {p.certificate_data.valid_date === 'any' ? 'Любой день' : new Date(p.certificate_data.valid_date).toLocaleDateString('ru')}</p>}
                      {p.certificate_data.comment && <p style={{ fontSize: 12, marginTop: 4, color: '#ddd' }}>Комментарий: {p.certificate_data.comment}</p>}
                    </div>
                  )}

                  {p.status === 'new' && (
                    <button onClick={() => setActivationModal({ show: true, purchase: p })} style={{
                      marginTop: 12, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,215,0,0.25)', borderRadius: 14, padding: '8px 0',
                      color: '#fff', cursor: 'pointer', fontSize: 13, width: '100%'
                    }}>Активировать</button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Модалка активации */}
      {activationModal.show && activationModal.purchase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setActivationModal({ show: false })}>
          <div style={{ background: '#1a1f2f', borderRadius: 20, padding: 32, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, marginBottom: 16 }}>Активация сертификата</h3>
            <p style={{ marginBottom: 16 }}>{activationModal.purchase.reward_name}</p>
            <input
              type="date"
              value={activationDate}
              onChange={e => setActivationDate(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 10, background: '#111', border: '1px solid #333', color: '#fff', marginBottom: 16 }}
            />
            <textarea
              value={activationComment}
              onChange={e => setActivationComment(e.target.value)}
              placeholder="Комментарий для руководителя"
              style={{ width: '100%', padding: 10, borderRadius: 10, background: '#111', border: '1px solid #333', color: '#fff', marginBottom: 16 }}
              rows={2}
            />
            <button onClick={handleActivate} style={{
              background: '#0f0', color: '#000', border: 'none', borderRadius: 10,
              padding: '12px 24px', width: '100%', cursor: 'pointer', fontWeight: 600
            }}>Отправить на согласование</button>
          </div>
        </div>
      )}

      <PremiumModal isOpen={notification.show} onClose={() => setNotification({ show: false })} title="Уведомление">
        <p style={{ color: '#fff' }}>{notification.message}</p>
      </PremiumModal>
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes breathe1 {
          0% { opacity: 0.7; transform: scaleY(1); }
          100% { opacity: 1; transform: scaleY(1.15); }
        }
      `}</style>
    </div>
  )
}
