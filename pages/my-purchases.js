import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import PremiumModal from '../components/PremiumModal'

export default function MyPurchases() {
  const [user, setUser] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [notification, setNotification] = useState({ show: false, message: '' })
  const [ratingModal, setRatingModal] = useState({ show: false, purchaseId: null })
  const [ratingValue, setRatingValue] = useState(0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      loadPurchases(user.id)
    }
    init()
  }, [])

  const loadPurchases = async (userId) => {
    const { data } = await supabase.from('purchases').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    setPurchases(data || [])
  }

  const submitRating = async () => {
    if (!ratingValue) return
    await supabase.from('purchases').update({ rating: ratingValue }).eq('id', ratingModal.purchaseId)
    setNotification({ show: true, message: 'Спасибо за оценку!' })
    setRatingModal({ show: false, purchaseId: null })
    loadPurchases(user.id)
  }

  if (!user) return null

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#000', fontFamily: 'Inter, sans-serif', color: '#fff', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, background: 'linear-gradient(135deg, #a0e9ff, #ffb3c6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 32 }}>Мои покупки</h1>

        {purchases.length === 0 && <p style={{ color: '#aaa' }}>Покупок пока нет</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {purchases.map(p => (
            <div key={p.id} style={{
              background: 'rgba(15, 20, 35, 0.8)', backdropFilter: 'blur(10px)', borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.1)', padding: 24, position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#aaa' }}>{new Date(p.created_at).toLocaleDateString('ru')}</span>
                <span style={{
                  padding: '4px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  background: p.status === 'approved' ? 'rgba(0,200,100,0.2)' : p.status === 'pending' ? 'rgba(255,200,0,0.2)' : p.status === 'rejected' ? 'rgba(255,0,0,0.2)' : 'rgba(100,100,255,0.2)',
                  color: p.status === 'approved' ? '#0f0' : p.status === 'pending' ? '#FFD700' : p.status === 'rejected' ? '#f44' : '#aaf'
                }}>
                  {p.status === 'approved' ? 'Одобрено' : p.status === 'pending' ? 'На согласовании' : p.status === 'rejected' ? 'Отклонено' : 'Новая'}
                </span>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{p.reward_name}</h3>
              <p style={{ color: '#ccc', marginBottom: 16 }}>Стоимость: {p.cost} кармиков</p>

              {p.certificate_data && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,180,0,0.1))',
                  border: '1px solid rgba(255,215,0,0.5)', borderRadius: 16, padding: 20, marginTop: 12
                }}>
                  <h4 style={{ fontSize: 16, color: '#FFD700', marginBottom: 8 }}>Сертификат</h4>
                  {p.certificate_data.valid_date && <p style={{ fontSize: 14 }}>Действителен: {p.certificate_data.valid_date === 'any' ? 'Любой день' : new Date(p.certificate_data.valid_date).toLocaleDateString('ru')}</p>}
                  {p.certificate_data.comment && <p style={{ fontSize: 14, marginTop: 8, color: '#ddd' }}>Комментарий руководителя: {p.certificate_data.comment}</p>}
                </div>
              )}

              {p.status === 'approved' && !p.rating && (
                <button onClick={() => setRatingModal({ show: true, purchaseId: p.id })} style={{
                  marginTop: 16, background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10,
                  padding: '8px 16px', color: '#fff', cursor: 'pointer', fontSize: 14
                }}>Оценить товар</button>
              )}
              {p.rating && (
                <div style={{ marginTop: 16, color: '#FFD700' }}>
                  {'★'.repeat(p.rating)}{'☆'.repeat(5 - p.rating)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Модальное окно оценки */}
      {ratingModal.show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setRatingModal({ show: false })}>
          <div style={{ background: '#1a1f2f', borderRadius: 20, padding: 32, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, marginBottom: 20, color: '#fff' }}>Оцените товар</h3>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
              {[1,2,3,4,5].map(star => (
                <div key={star} onClick={() => setRatingValue(star)} style={{ fontSize: 32, cursor: 'pointer', color: star <= ratingValue ? '#FFD700' : '#555' }}>★</div>
              ))}
            </div>
            <button onClick={submitRating} style={{ background: 'linear-gradient(135deg, #f97316, #e65c00)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 10, width: '100%' }}>Отправить</button>
          </div>
        </div>
      )}

      <PremiumModal isOpen={notification.show} onClose={() => setNotification({ show: false })} title="Уведомление">
        <p style={{ color: '#fff' }}>{notification.message}</p>
      </PremiumModal>
    </div>
  )
}
