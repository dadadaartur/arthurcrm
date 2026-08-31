import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import PremiumModal from '../../components/PremiumModal'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const TYPE_LABELS = {
  digital: 'Сертификат', workplace: 'Рабочее место', delivery: 'Доставка', promocode: 'Промокод'
}
const TYPE_COLORS = {
  digital: '#7c3aed', workplace: '#0e7490', delivery: '#c2410c', promocode: '#137a39'
}

const ghostBtn = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-gold)', borderRadius: 12,
  padding: '10px 22px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13,
  transition: 'all .25s', letterSpacing: 0.3
}
const hoverOn = e => {
  e.currentTarget.style.borderColor = '#8a6208'
  e.currentTarget.style.boxShadow = '0 0 14px rgba(138,98,8,0.18)'
  e.currentTarget.style.transform = 'translateY(-1px)'
}
const hoverOff = e => {
  e.currentTarget.style.borderColor = 'var(--border-gold)'
  e.currentTarget.style.boxShadow = 'none'
  e.currentTarget.style.transform = 'translateY(0)'
}
const pillTab = a => ({
  padding: '8px 18px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
  background: a ? 'rgba(184,134,11,0.12)' : 'var(--bg-card)',
  border: `1px solid ${a ? 'var(--border-gold)' : 'var(--border-subtle)'}`,
  color: a ? '#8a6208' : 'var(--text-secondary)', fontWeight: a ? 700 : 400, transition: 'all 0.2s'
})

export default function RewardsAdmin() {
  const router = useRouter()
  const { showSuccess, showError } = useFeedback()
  const [profile, setProfile] = useState(null)
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('create')
  const [form, setForm] = useState({
    name: '', description: '', cost: '', type: 'digital',
    requires_approval: false, limit_per_user: '', image_file: null, preview_url: '',
    is_featured: false, promo_label: '', partner_name: '', requires_unlock: ''
  })
  const [editingId, setEditingId] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ show: false, rewardId: null, rewardName: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles')
        .select('company_id, role_id, is_company_admin, deleted_at')
        .eq('user_id', user.id).maybeSingle()
      if (!prof || prof.deleted_at || !(prof.is_company_admin || prof.role_id === 1)) {
        router.push('/'); return
      }
      setProfile(prof)
      await loadRewards(prof)
      setLoading(false)
    }
    init()
  }, [])

  const loadRewards = async (prof) => {
    const { data } = await supabase.from('rewards').select('*')
      .eq('company_id', prof.company_id).order('created_at', { ascending: false })
    setRewards(data || [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const costValue = parseInt(form.cost, 10)
    if (!form.name || isNaN(costValue) || costValue < 0) {
      showError('Введите название и корректную стоимость')
      return
    }
    let imageUrl = form.preview_url || null
    if (form.image_file) {
      const fileExt = form.image_file.name.split('.').pop()
      const fileName = `reward-${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('avatars').upload(`public/${fileName}`, form.image_file)
      if (error) { showError('Ошибка загрузки изображения'); return }
      const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(`public/${fileName}`)
      imageUrl = publicUrl.publicUrl
    }
    const rewardData = {
      name: form.name, description: form.description, cost: costValue, type: form.type,
      requires_approval: form.requires_approval,
      limit_per_user: form.limit_per_user ? parseInt(form.limit_per_user) : null,
      image_url: imageUrl, company_id: profile.company_id,
      is_featured: form.is_featured, promo_label: form.promo_label || null,
      partner_name: form.partner_name || null, requires_unlock: form.requires_unlock || null
    }
    const { error } = editingId
      ? await supabase.from('rewards').update(rewardData).eq('id', editingId)
      : await supabase.from('rewards').insert(rewardData)
    if (error) { showError('Ошибка сохранения: ' + error.message); return }
    showSuccess(editingId ? 'Товар обновлён' : 'Товар создан')
    setForm({ name: '', description: '', cost: '', type: 'digital', requires_approval: false, limit_per_user: '', image_file: null, preview_url: '', is_featured: false, promo_label: '', partner_name: '', requires_unlock: '' })
    setEditingId(null)
    loadRewards(profile)
  }

  const handleEdit = (reward) => {
    setEditingId(reward.id)
    setTab('create')
    setForm({
      name: reward.name, description: reward.description || '', cost: reward.cost.toString(),
      type: reward.type || 'digital', requires_approval: reward.requires_approval || false,
      limit_per_user: reward.limit_per_user ? reward.limit_per_user.toString() : '',
      image_file: null, preview_url: reward.image_url || '',
      is_featured: reward.is_featured || false, promo_label: reward.promo_label || '',
      partner_name: reward.partner_name || '', requires_unlock: reward.requires_unlock || ''
    })
  }

  const handleDelete = async () => {
    const { rewardId } = deleteModal
    if (!rewardId) return
    const { error } = await supabase.from('rewards').delete().eq('id', rewardId)
    if (error) showError('Ошибка удаления: ' + error.message)
    else { showSuccess('Товар удалён'); loadRewards(profile) }
    setDeleteModal({ show: false, rewardId: null, rewardName: '' })
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Управление товарами" extra={
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)', alignSelf: 'center' }}>
            Всего товаров: <b style={{ color: 'var(--accent-gold)' }}>{rewards.length}</b>
          </div>
        } />

        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          <button onClick={() => { setTab('create'); setEditingId(null) }} style={pillTab(tab === 'create')}>
            {editingId ? 'Редактирование' : 'Создать товар'}
          </button>
          <button onClick={() => setTab('history')} style={pillTab(tab === 'history')}>
            Витрина · {rewards.length}
          </button>
        </div>

        {tab === 'create' && (
          <div style={{
            background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)',
            borderRadius: 20, padding: 32, border: '1px solid var(--border-subtle)',
            maxWidth: 900
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, color: 'var(--text-primary)' }}>
              {editingId ? 'Редактировать товар' : 'Новый товар'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Название</label>
                  <input className="input-field" style={{ width: '100%' }} placeholder="Например: День вне очереди"
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Стоимость (кармики)</label>
                  <input type="number" className="input-field" style={{ width: '100%' }} min="0" step="1" placeholder="100"
                    value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Тип товара</label>
                  <select className="input-field" style={{ width: '100%' }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="digital">Сертификат</option>
                    <option value="workplace">Рабочее место</option>
                    <option value="delivery">Доставка</option>
                    <option value="promocode">Промокод</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Лимит на сотрудника</label>
                  <input type="number" className="input-field" style={{ width: '100%' }} min="1" placeholder="Без лимита"
                    value={form.limit_per_user} onChange={e => setForm({ ...form, limit_per_user: e.target.value })} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.requires_approval}
                      onChange={e => setForm({ ...form, requires_approval: e.target.checked })}
                      style={{ accentColor: '#8a6208' }} />
                    Требуется согласование
                  </label>
                </div>
                <div style={{ gridColumn: 'span 3', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, padding: 16, borderRadius: 12, background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <div style={{ gridColumn: 'span 4' }}>
                    <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, marginBottom: 4 }}>Лента наверху магазина и партнёрские категории</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>Товар попадёт в горизонтальную ленту вверху магазина, если заполнить промо-метку или включить «Показывать в ленте». Поле «Партнёр» создаёт отдельную вкладку-категорию в магазине — она появится автоматически, как только у товара будет заполнено это поле.</div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Партнёр (категория в магазине)</label>
                    <input className="input-field" style={{ width: '100%' }} placeholder="напр. МТС" value={form.partner_name} onChange={e => setForm({ ...form, partner_name: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Ключ разблокировки</label>
                    <input className="input-field" style={{ width: '100%' }} placeholder="совпадает с заданием" value={form.requires_unlock} onChange={e => setForm({ ...form, requires_unlock: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Промо-метка (попадёт в ленту)</label>
                    <input className="input-field" style={{ width: '100%' }} placeholder="напр. Скидка 20%" value={form.promo_label} onChange={e => setForm({ ...form, promo_label: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                    <label onClick={() => setForm({ ...form, is_featured: !form.is_featured })} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500, color: form.is_featured ? '#8a6208' : 'var(--text-primary)', cursor: 'pointer', width: '100%', padding: '10px 14px', borderRadius: 12, background: form.is_featured ? 'rgba(184,134,11,0.1)' : 'var(--bg-page)', border: `1px solid ${form.is_featured ? 'var(--border-gold)' : 'var(--border-subtle)'}`, transition: 'all 0.2s' }}>
                      <input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} style={{ accentColor: '#8a6208' }} />
                      Показывать в ленте
                    </label>
                  </div>
                </div>
                <div style={{ gridColumn: 'span 3' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Описание</label>
                  <textarea className="input-field" style={{ width: '100%' }} rows={2}
                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 3' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Изображение</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px',
                      borderRadius: 10, border: '1px dashed var(--border-gold)',
                      background: 'var(--bg-page)', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)',
                      transition: 'all .2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#8a6208'; e.currentTarget.style.color = '#8a6208' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                      {form.image_file ? form.image_file.name : form.preview_url ? 'Заменить изображение' : 'Выбрать файл'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                        const file = e.target.files[0]
                        if (file) setForm({ ...form, image_file: file, preview_url: URL.createObjectURL(file) })
                      }} />
                    </label>
                    {form.preview_url && (
                      <img src={form.preview_url} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border-subtle)' }} />
                    )}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 10 }}>
                <button type="submit" style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                  {editingId ? 'Сохранить изменения' : 'Создать товар'}
                </button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', description: '', cost: '', type: 'digital', requires_approval: false, limit_per_user: '', image_file: null, preview_url: '' }) }}
                    className="btn-outline">Отмена</button>
                )}
              </div>
            </form>
          </div>
        )}

        {tab === 'history' && (
          <>
          <div style={{ marginBottom: 20, padding: 18, borderRadius: 16, background: 'rgba(184,134,11,0.04)', border: '1px solid var(--border-gold)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-gold)', marginBottom: 10 }}>Сейчас в ленте наверху магазина ({rewards.filter(r => r.is_featured || r.promo_label).length})</div>
            {rewards.filter(r => r.is_featured || r.promo_label).length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Пока пусто. Откройте товар на редактирование и в блоке «Лента наверху магазина» включите «Показывать в ленте» или заполните промо-метку.</p>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {rewards.filter(r => r.is_featured || r.promo_label).map(r => (
                  <button key={r.id} onClick={() => handleEdit(r)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: 'rgba(184,134,11,0.08)', border: '1px solid var(--border-gold)', color: '#8a6208', fontSize: 12, cursor: 'pointer' }}>
                    {r.name}{r.promo_label ? ` · ${r.promo_label}` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {rewards.length === 0 && (
              <div style={{ gridColumn: '1 / -1', background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 60, textAlign: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                Товаров пока нет
              </div>
            )}
            {rewards.map((reward, i) => (
              <div key={reward.id} style={{
                background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)',
                borderRadius: 16, padding: 18, border: '1px solid var(--border-subtle)',
                opacity: 0, animation: `fadeUp 0.5s ${i * 0.04}s ease-out forwards`,
                transition: 'border-color 0.25s, box-shadow 0.25s',
                display: 'flex', flexDirection: 'column', gap: 12
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}>
                {reward.image_url && (
                  <img src={reward.image_url} alt="" style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 12 }} />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1,
                    background: `${TYPE_COLORS[reward.type] || '#8a6208'}18`,
                    color: TYPE_COLORS[reward.type] || '#8a6208',
                    border: `1px solid ${TYPE_COLORS[reward.type] || '#8a6208'}44`
                  }}>
                    {TYPE_LABELS[reward.type] || reward.type}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-gold)' }}>{reward.cost} карм.</span>
                </div>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 15 }}>{reward.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {reward.description || 'Без описания'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  <button onClick={() => handleEdit(reward)} style={{ ...ghostBtn, flex: 1, padding: '8px 12px', fontSize: 12 }}
                    onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Редактировать</button>
                  <button onClick={() => setDeleteModal({ show: true, rewardId: reward.id, rewardName: reward.name })}
                    style={{
                      flex: 1, padding: '8px 12px', fontSize: 12, borderRadius: 12, cursor: 'pointer',
                      background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.3)',
                      color: '#dc2626', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.boxShadow = 'none' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'; e.currentTarget.style.boxShadow = 'none' }}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}

        {/* Модалка удаления */}
        <PremiumModal isOpen={deleteModal.show} onClose={() => setDeleteModal({ show: false, rewardId: null, rewardName: '' })} title="Удалить товар?" showCloseButton={false}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Вы действительно хотите удалить «{deleteModal.rewardName}»?</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setDeleteModal({ show: false, rewardId: null, rewardName: '' })} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
            <button onClick={handleDelete} style={{
              flex: 1, padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
              background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.4)',
              color: '#dc2626', cursor: 'pointer'
            }}>Удалить</button>
          </div>
        </PremiumModal>

        <style jsx>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  )
}
