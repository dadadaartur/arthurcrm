// pages/company.js — «Моя компания» (пункт 1 фидбека от 2 сентября
// 2026). Раньше — голая заглушка «в разработке». Одна страница для
// всех: сотрудник видит логотип, описание и новости; админ компании
// видит то же самое плюс редактирование прямо здесь же, без ухода на
// отдельную админскую страницу — по тому же принципу, что уже
// закреплён в DESIGN_PRINCIPLES.md: не разносить связанную работу по
// разным разделам без необходимости.
import { useEffect, useState } from 'react'
import BackArrow from '../components/BackArrow'
import LoadingScreen from '../components/LoadingScreen'
import { supabase } from '../lib/supabaseClient'
import { useProfile } from '../context/ProfileContext'
import { isCompanyAdmin } from '../lib/permissions'
import { useFeedback } from '../context/ActionFeedbackContext'

const ghostBtn = { background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12, padding: '9px 18px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#8a6208'; e.currentTarget.style.boxShadow = '0 0 14px rgba(138,98,8,0.18)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.boxShadow = 'none' }

export default function CompanyPage() {
  const { profile } = useProfile()
  const { showSuccess, showError } = useFeedback()
  const isAdmin = isCompanyAdmin(profile)
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState(null)
  const [news, setNews] = useState([])
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', description: '', logo_file: null })
  const [showNewsForm, setShowNewsForm] = useState(false)
  const [newsForm, setNewsForm] = useState({ title: '', content: '', linkUrl: '', linkLabel: '', image_file: null, video_file: null })
  const [posting, setPosting] = useState(false)

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }

  const load = async () => {
    const h = await auth()
    const [cr, nr] = await Promise.all([
      fetch('/api/company-admin/company-profile', { headers: h }),
      fetch('/api/company-admin/news', { headers: h }),
    ])
    if (cr.ok) { const d = await cr.json(); setCompany(d.company); setProfileForm({ name: d.company?.name || '', description: d.company?.description || '', logo_file: null }) }
    if (nr.ok) setNews((await nr.json()).news || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const saveProfile = async () => {
    const h = await auth()
    let logoUrl = company?.logo_url
    if (profileForm.logo_file) {
      const ext = profileForm.logo_file.name.split('.').pop()
      const path = `public/company-logo-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, profileForm.logo_file)
      if (!upErr) logoUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }
    const r = await fetch('/api/company-admin/company-profile', { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: profileForm.name, description: profileForm.description, logoUrl }) })
    if (r.ok) { showSuccess('Профиль компании обновлён'); setEditingProfile(false); load() }
    else showError('Не удалось сохранить')
  }

  const postNews = async () => {
    if (!newsForm.title.trim()) { showError('Укажите заголовок новости'); return }
    setPosting(true)
    const h = await auth()
    let imageUrl = null, videoUrl = null
    if (newsForm.image_file) {
      const ext = newsForm.image_file.name.split('.').pop()
      const path = `public/news-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, newsForm.image_file)
      if (!error) imageUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }
    if (newsForm.video_file) {
      const ext = newsForm.video_file.name.split('.').pop()
      const path = `public/news-video-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, newsForm.video_file)
      if (!error) videoUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }
    const r = await fetch('/api/company-admin/news', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newsForm.title, content: newsForm.content, imageUrl, videoUrl, linkUrl: newsForm.linkUrl, linkLabel: newsForm.linkLabel }) })
    setPosting(false)
    if (r.ok) { showSuccess('Новость опубликована'); setShowNewsForm(false); setNewsForm({ title: '', content: '', linkUrl: '', linkLabel: '', image_file: null, video_file: null }); load() }
    else showError('Не удалось опубликовать')
  }

  const deleteNews = async (id) => {
    if (!confirm('Удалить новость?')) return
    const h = await auth()
    const r = await fetch('/api/company-admin/news', { method: 'DELETE', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (r.ok) { showSuccess('Новость удалена'); load() } else showError('Не удалось удалить')
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="theme-light" style={{ minHeight: '100vh', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <BackArrow href="/" title="Моя компания" />

        {/* Профиль компании — логотип, название, описание */}
        <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 28, marginBottom: 28, border: '1px solid var(--border-subtle)' }}>
          {editingProfile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Логотип</label>
                <label htmlFor="company-logo-upload" className="input-field" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: profileForm.logo_file ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {(profileForm.logo_file || company?.logo_url) && <img src={profileForm.logo_file ? URL.createObjectURL(profileForm.logo_file) : company.logo_url} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} />}
                  {profileForm.logo_file ? profileForm.logo_file.name : company?.logo_url ? 'Заменить логотип…' : 'Выбрать файл…'}
                </label>
                <input id="company-logo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setProfileForm({ ...profileForm, logo_file: e.target.files?.[0] || null })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Название</label>
                <input className="input-field" style={{ width: '100%' }} value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Описание</label>
                <textarea className="input-field" style={{ width: '100%' }} rows={3} placeholder="Чем занимается компания, миссия и т.д." value={profileForm.description} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditingProfile(false)} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
                <button onClick={saveProfile} style={{ ...ghostBtn, flex: 1 }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: 18, background: company?.logo_url ? undefined : 'linear-gradient(135deg, rgba(184,134,11,0.14), rgba(124,58,237,0.1))', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {company?.logo_url ? <img src={company.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent-gold)' }}>{company?.name?.charAt(0)}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{company?.name}</h1>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: '6px 0 0', maxWidth: 640 }}>{company?.description || (isAdmin ? 'Описание ещё не добавлено — расскажите сотрудникам о компании.' : 'Описание пока не добавлено.')}</p>
              </div>
              {isAdmin && <button onClick={() => setEditingProfile(true)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Редактировать</button>}
            </div>
          )}
        </div>

        {/* Новости */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Новости компании</h2>
          {isAdmin && <button onClick={() => setShowNewsForm(true)} style={{ ...ghostBtn, borderColor: 'var(--border-gold)', color: 'var(--accent-gold)' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>+ Новость</button>}
        </div>

        {showNewsForm && (
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 18, padding: 24, marginBottom: 20, border: '1px solid var(--border-gold)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input-field" style={{ width: '100%' }} placeholder="Заголовок новости" value={newsForm.title} onChange={e => setNewsForm({ ...newsForm, title: e.target.value })} autoFocus />
              <textarea className="input-field" style={{ width: '100%' }} rows={3} placeholder="Текст новости" value={newsForm.content} onChange={e => setNewsForm({ ...newsForm, content: e.target.value })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label htmlFor="news-image-upload" className="input-field" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: newsForm.image_file ? 'var(--text-primary)' : 'var(--text-muted)' }}>{newsForm.image_file ? newsForm.image_file.name : 'Изображение (необязательно)'}</label>
                  <input id="news-image-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setNewsForm({ ...newsForm, image_file: e.target.files?.[0] || null })} />
                </div>
                <div>
                  <label htmlFor="news-video-upload" className="input-field" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: newsForm.video_file ? 'var(--text-primary)' : 'var(--text-muted)' }}>{newsForm.video_file ? newsForm.video_file.name : 'Видео (необязательно)'}</label>
                  <input id="news-video-upload" type="file" accept="video/*" style={{ display: 'none' }} onChange={e => setNewsForm({ ...newsForm, video_file: e.target.files?.[0] || null })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input className="input-field" placeholder="Ссылка на материал в банке (необязательно)" value={newsForm.linkUrl} onChange={e => setNewsForm({ ...newsForm, linkUrl: e.target.value })} />
                <input className="input-field" placeholder="Подпись для ссылки" value={newsForm.linkLabel} onChange={e => setNewsForm({ ...newsForm, linkLabel: e.target.value })} disabled={!newsForm.linkUrl} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowNewsForm(false)} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
                <button onClick={postNews} disabled={posting} style={{ ...ghostBtn, flex: 1, borderColor: 'var(--border-gold)', color: '#8a6208' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>{posting ? 'Публикуем…' : 'Опубликовать'}</button>
              </div>
            </div>
          </div>
        )}

        {news.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>
            Новостей пока нет.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {news.map(n => (
              <div key={n.id} style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                {n.image_url && <img src={n.image_url} alt="" style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} />}
                {n.video_url && <video src={n.video_url} controls style={{ width: '100%', maxHeight: 320 }} />}
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{n.title}</h3>
                    {isAdmin && <button onClick={() => deleteNews(n.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>}
                  </div>
                  {n.content && <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: '8px 0 0', lineHeight: 1.6 }}>{n.content}</p>}
                  {n.link_url && <a href={n.link_url} style={{ display: 'inline-block', marginTop: 12, fontSize: 13, color: '#8a6208', fontWeight: 600, textDecoration: 'none' }}>{n.link_label || 'Подробнее'} →</a>}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>{new Date(n.created_at).toLocaleDateString('ru')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
