import { useEffect, useState } from 'react'
import DatePicker from '../components/DatePicker'
import LoadingScreen from '../components/LoadingScreen'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import PremiumModal from '../components/PremiumModal'
import BackArrow from '../components/BackArrow'

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
    const [{ data: purchaseData }, { data: wheelData }] = await Promise.all([
      supabase.from('purchases').select('*, rewards ( image_url )').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('wheel_spin_history').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    ])

    const enrichedPurchases = (purchaseData || []).map(p => ({
      ...p,
      image_url: p.rewards?.image_url || null,
      isWheelPrize: false
    }))

    // Выигрыши ленты подарков приводим к той же форме, что и обычные
    // покупки (reward_name, cost, status, created_at, image_url) — чтобы
    // рендерить одним и тем же кодом карточки, не задваивая вёрстку.
    // «cost» здесь условный — приз бесплатный, но карточка ожидает это
    // поле для отображения суммы, поэтому 0.
    const enrichedWheel = (wheelData || []).map(w => ({
      id: `wheel-${w.id}`,
      reward_name: w.prize_label,
      cost: 0,
      status: 'approved',
      created_at: w.created_at,
      image_url: w.prize_avatar_url,
      prizeDescription: w.prize_description || null,
      isWheelPrize: true,
      wheelColor: w.prize_color || '#8a6208'
    }))

    const merged = [...enrichedPurchases, ...enrichedWheel].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setPurchases(merged)
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

  if (loading) return <LoadingScreen />

  const filteredPurchases = filterType === 'all' ? purchases : purchases.filter(p => p.status === filterType)

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '20px', position: 'relative' }}>
      <Head><title>Мои покупки | Кармический банк</title></Head>

      <div style={{ position: 'relative', zIndex: 1, margin: '0 auto' }}>
        {/* Верхняя строка: Назад + заголовок */}
        <BackArrow href="/" title="Мои покупки" />

        {/* Фильтры */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {['all', 'new', 'pending', 'approved', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilterType(status)}
              className={`filter-pill ${filterType === status ? 'active' : ''}`}
            >
              {status === 'all' ? 'Все' : statusLabels[status]}
            </button>
          ))}
        </div>

        {filteredPurchases.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Нет покупок</p>
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
                  background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20,
                  border: p.isWheelPrize ? `1px solid ${p.wheelColor}55` : '1px solid var(--border-subtle)', padding: 20,
                  display: 'flex', flexDirection: 'column',
                  minHeight: 360
                }}>
                  {p.image_url && (
                    <img src={p.image_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }} />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{new Date(p.created_at).toLocaleDateString('ru')}</span>
                    {p.isWheelPrize ? (
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: `${p.wheelColor}18`, color: p.wheelColor, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="8" width="18" height="4" /><path d="M12 8v13M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8" /></svg>
                        Лента подарков
                      </span>
                    ) : (
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: p.status === 'approved' ? 'rgba(19,122,57,0.1)' : p.status === 'pending' ? 'rgba(180,83,9,0.1)' : p.status === 'rejected' ? 'rgba(220,38,38,0.1)' : 'rgba(37,99,235,0.1)',
                        color: p.status === 'approved' ? '#137a39' : p.status === 'pending' ? '#b45309' : p.status === 'rejected' ? '#dc2626' : '#2563eb'
                      }}>
                        {statusLabels[p.status] || p.status}
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>{p.reward_name}</h3>
                  {!p.isWheelPrize && <p style={{ color: 'var(--text-secondary)', marginBottom: 10, fontSize: 13 }}>{p.cost} {word}</p>}
                  {p.isWheelPrize && p.prizeDescription && <p style={{ color: 'var(--text-secondary)', marginBottom: 10, fontSize: 13 }}>{p.prizeDescription}</p>}

                  {p.certificate_data && (
                    <div style={{
                      background: 'rgba(184,134,11,0.06)',
                      border: '1px solid var(--border-gold)', borderRadius: 12, padding: 12, marginTop: 'auto'
                    }}>
                      <h4 style={{ fontSize: 14, color: 'var(--accent-gold)', marginBottom: 4 }}>Сертификат</h4>
                      {p.certificate_data.valid_date && <p style={{ fontSize: 12, color: 'var(--text-primary)' }}>Действителен: {p.certificate_data.valid_date === 'any' ? 'Любой день' : new Date(p.certificate_data.valid_date).toLocaleDateString('ru')}</p>}
                      {p.certificate_data.comment && <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-secondary)' }}>Комментарий: {p.certificate_data.comment}</p>}
                    </div>
                  )}

                  {p.status === 'new' && (
                    <button onClick={() => setActivationModal({ show: true, purchase: p })} className="btn-outline" style={{
                      marginTop: 12, alignSelf: 'flex-start'
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setActivationModal({ show: false })}>
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card-hover)', borderRadius: 20, padding: 32, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, marginBottom: 16, color: 'var(--text-primary)' }}>Активация сертификата</h3>
            <p style={{ marginBottom: 16, color: 'var(--text-primary)' }}>{activationModal.purchase.reward_name}</p>
            <div style={{ marginBottom: 16 }}>
              <DatePicker value={activationDate} onChange={setActivationDate} placeholder="Выберите дату" />
            </div>
            <textarea
              value={activationComment}
              onChange={e => setActivationComment(e.target.value)}
              placeholder="Комментарий для руководителя"
              className="input-field"
              style={{ width: '100%', marginBottom: 16 }}
              rows={2}
            />
            <button onClick={handleActivate} className="btn-gold" style={{ minWidth: 220 }}>Отправить на согласование</button>
          </div>
        </div>
      )}

      <PremiumModal isOpen={notification.show} onClose={() => setNotification({ show: false })} title="Уведомление">
        <p style={{ color: 'var(--text-primary)' }}>{notification.message}</p>
      </PremiumModal>
    </div>
  )
}
