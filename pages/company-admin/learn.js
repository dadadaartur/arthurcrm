import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import TrainingVideoModal from '../../components/TrainingVideoModal'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const ghostBtn = { background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 12, padding: '7px 14px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 11, transition: 'all .25s' }
const hoverOn = e => { e.currentTarget.style.borderColor = '#8a6208'; e.currentTarget.style.boxShadow = '0 0 14px rgba(138,98,8,0.18)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.boxShadow = 'none' }

function LearnAdmin() {
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [trainings, setTrainings] = useState([])
  const [tests, setTests] = useState([])
  const [employees, setEmployees] = useState([])
  const [positions, setPositions] = useState([])
  const [views, setViews] = useState([])
  const [tab, setTab] = useState('active')
  const [video, setVideo] = useState(null)
  const [preview, setPreview] = useState(null)
  const [edit, setEdit] = useState(null)
  const [progressOpen, setProgressOpen] = useState(null)

  const load = async () => {
    const { data: tr } = await supabase.from('kpi_trainings').select('*, kpi_metrics(name)')
    const { data: ts } = await supabase.from('tests').select('*').eq('is_active', true)
    const { data: em } = await supabase.from('profiles').select('user_id, first_name, last_name, display_name, email, position_id').eq('is_company_admin', false).is('deleted_at', null)
    const { data: pos } = await supabase.from('positions').select('*')
    const { data: vw } = await supabase.from('training_views').select('*')
    setTrainings(tr || []); setTests(ts || []); setEmployees(em || []); setPositions(pos || []); setViews(vw || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const empName = id => { const e = employees.find(x => x.user_id === id); return e ? ([e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email) : '—' }

  const saveTraining = async () => {
    if (!edit.title || !edit.title.trim()) { showError('Укажите название'); return }
    const payload = {
      title: edit.title, type: edit.type || 'video', url: edit.url || null, content: edit.content || null,
      recommend_below: edit.recommend_below || 'all', metric_id: edit.metric_id || null,
      assign_type: edit.assign_type || 'all', assign_positions: edit.assign_positions || null,
      assign_users: edit.assign_users || null, is_archived: !!edit.is_archived
    }
    let error = null
    if (edit.id) { const r = await supabase.from('kpi_trainings').update(payload).eq('id', edit.id); error = r.error }
    else { const r = await supabase.from('kpi_trainings').insert(payload); error = r.error }
    if (error) { showError('Ошибка: ' + error.message); return }
    showSuccess(edit.id ? 'Тренинг обновлён' : 'Тренинг создан')
    setEdit(null); load()
  }
  const uploadVideo = async f => {
    if (!f) return
    const path = `trainings/${Date.now()}_${f.name}`
    const { error } = await supabase.storage.from('trainings').upload(path, f)
    if (error) { showError('Ошибка загрузки'); return }
    setEdit(e => ({ ...e, url: supabase.storage.from('trainings').getPublicUrl(path).data.publicUrl }))
    showSuccess('Видео прикреплено')
  }
  const archive = async (t, val) => { await supabase.from('kpi_trainings').update({ is_archived: val }).eq('id', t.id); showSuccess(val ? 'Тренинг в архиве' : 'Тренинг восстановлен'); load() }
  const del = async t => { await supabase.from('kpi_trainings').delete().eq('id', t.id); showSuccess('Тренинг удалён'); load() }
  const openPreview = async id => {
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch(`/api/kpi/tests?action=get&id=${id}&mode=edit`, { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (r.ok) setPreview(await r.json())
  }

  const watchStats = t => {
    const list = views.filter(v => v.training_id === t.id)
    const byUser = {}
    list.forEach(v => {
      const cur = byUser[v.user_id] || { watched: 0, duration: 0, completed: false }
      byUser[v.user_id] = { watched: Math.max(cur.watched, v.watched_seconds || 0), duration: Math.max(cur.duration, v.duration || 0), completed: cur.completed || v.completed }
    })
    return Object.entries(byUser).map(([uid, s]) => ({ uid, ...s, pct: s.duration ? Math.min(100, Math.round(s.watched / s.duration * 100)) : (s.completed ? 100 : 0) }))
  }

  const shown = trainings.filter(t => tab === 'archive' ? t.is_archived : !t.is_archived)

  if (loading) return <LoadingScreen />

  return (
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Обучение: тренинги и тесты" extra={
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={() => setTab('active')} style={{ ...ghostBtn, color: tab === 'active' ? '#8a6208' : 'var(--text-primary)', borderColor: tab === 'active' ? 'var(--border-gold)' : 'var(--border-gold)' }}>Активные</button>
            <button onClick={() => setTab('archive')} style={{ ...ghostBtn, color: tab === 'archive' ? '#8a6208' : 'var(--text-primary)', borderColor: tab === 'archive' ? 'var(--border-gold)' : 'var(--border-gold)' }}>Архив</button>
            <button onClick={() => setEdit({ type: 'video', assign_type: 'all', recommend_below: 'all' })} style={{ ...ghostBtn, borderColor: 'var(--border-gold)', color: 'var(--accent-gold)' }}>Новый тренинг</button>
          </div>
        } />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12, marginBottom: 32 }}>
          {shown.map(t => (
            <div key={t.id} style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 14, padding: 16, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t.assign_type === 'all' ? 'всем' : t.assign_type === 'position' ? 'по должности' : 'индивидуально'}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Показатель: {t.kpi_metrics?.name || '—'} · {t.type === 'video' ? 'видео' : 'текст'}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
                {t.type === 'video' && <button onClick={() => setVideo(t)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Видео</button>}
                {t.test_id && <button onClick={() => openPreview(t.test_id)} style={{ ...ghostBtn, borderColor: 'rgba(124,58,237,0.35)', color: '#7c3aed' }}>Тест</button>}
                <button onClick={() => setProgressOpen(progressOpen === t.id ? null : t.id)} style={ghostBtn}>Просмотры</button>
                <button onClick={() => setEdit({ ...t })} style={ghostBtn}>Изменить</button>
                <button onClick={() => archive(t, !t.is_archived)} style={ghostBtn}>{t.is_archived ? 'Вернуть' : 'В архив'}</button>
                <button onClick={() => del(t)} style={{ ...ghostBtn, borderColor: 'rgba(220,38,38,0.3)', color: '#dc2626' }}>Удалить</button>
              </div>
              {progressOpen === t.id && (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {watchStats(t).length === 0 && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ещё никто не смотрел</p>}
                  {watchStats(t).map(s => (
                    <div key={s.uid} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                      <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{empName(s.uid)}</span>
                      <div style={{ width: 90, height: 5, borderRadius: 3, background: 'var(--bg-page)' }}><div style={{ height: '100%', width: s.pct + '%', borderRadius: 3, background: s.pct >= 90 ? '#137a39' : '#8a6208' }} /></div>
                      <span style={{ color: s.pct >= 90 ? '#137a39' : '#8a6208', width: 34, textAlign: 'right' }}>{s.pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {shown.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{tab === 'archive' ? 'Архив пуст' : 'Тренингов пока нет'}</p>}
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#7c3aed' }}>Тесты</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {tests.map(t => (
            <div key={t.id} style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 14, padding: 16, border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>{t.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '6px 0' }}>Порог {t.passing_score}% · {t.karma_reward} карм.</div>
              <button onClick={() => openPreview(t.id)} style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Предпросмотр</button>
            </div>
          ))}
        </div>
      </div>

      {video && <TrainingVideoModal training={video} onClose={() => setVideo(null)} />}

      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setPreview(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(760px, 94vw)', maxHeight: '86vh', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card-hover)', borderRadius: 20, padding: 26, position: 'relative' }}>
            <button onClick={() => setPreview(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>Предпросмотр: {preview.title}</h3>
            {(preview.questions || []).map((q, i) => (
              <div key={q.id} style={{ padding: 14, borderRadius: 12, background: 'var(--bg-page)', border: '1px solid var(--border-subtle)', marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>{i + 1}. {q.text}</div>
                {(q.options || []).map((o, oi) => (
                  <div key={oi} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, marginBottom: 4, background: o.is_correct ? 'rgba(19,122,57,0.08)' : 'var(--bg-card)', color: o.is_correct ? '#137a39' : 'var(--text-secondary)', border: '1px solid ' + (o.is_correct ? 'rgba(19,122,57,0.35)' : 'var(--border-subtle)') }}>{o.text}{o.is_correct && ' · верно'}</div>
                ))}
                {q.type === 'fill' && <div style={{ fontSize: 12, color: '#137a39' }}>Ответ: {q.correct_text}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {edit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setEdit(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(720px, 94vw)', maxHeight: '88vh', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card-hover)', borderRadius: 20, padding: 26, position: 'relative' }}>
            <button onClick={() => setEdit(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>{edit.id ? 'Редактировать тренинг' : 'Новый тренинг'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Название</label><input className="input-field" style={{ width: '100%' }} value={edit.title || ''} onChange={e => setEdit({ ...edit, title: e.target.value })} /></div>
              <div><label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Тип</label><select className="input-field" style={{ width: '100%' }} value={edit.type} onChange={e => setEdit({ ...edit, type: e.target.value })}><option value="video">Видео</option><option value="text">Текст</option></select></div>
              <div><label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Рекомендация</label><select className="input-field" style={{ width: '100%' }} value={edit.recommend_below} onChange={e => setEdit({ ...edit, recommend_below: e.target.value })}><option value="all">Всем</option><option value="min">Ниже «мин»</option><option value="mid">Ниже «средн»</option><option value="top">Ниже «топ»</option></select></div>
              {edit.type === 'video' && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Видео (URL или файл)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input-field" style={{ flex: 1 }} placeholder="URL" value={edit.url || ''} onChange={e => setEdit({ ...edit, url: e.target.value })} />
                    <label style={{ ...ghostBtn, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>Файл<input type="file" accept="video/*" style={{ display: 'none' }} onChange={e => uploadVideo(e.target.files[0])} /></label>
                  </div>
                </div>
              )}
              {edit.type === 'text' && <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Текст</label><textarea className="input-field" style={{ width: '100%' }} rows={4} value={edit.content || ''} onChange={e => setEdit({ ...edit, content: e.target.value })} /></div>}
              <div><label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Кому назначить</label><select className="input-field" style={{ width: '100%' }} value={edit.assign_type} onChange={e => setEdit({ ...edit, assign_type: e.target.value })}><option value="all">Всем</option><option value="position">По должности</option><option value="individual">Индивидуально</option></select></div>
              {edit.assign_type === 'position' && (
                <div><label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Должности</label>
                  <select multiple className="input-field" style={{ width: '100%', height: 90 }} value={edit.assign_positions || []} onChange={e => setEdit({ ...edit, assign_positions: [...e.target.selectedOptions].map(o => Number(o.value)) })}>
                    {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
              )}
              {edit.assign_type === 'individual' && (
                <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Сотрудники</label>
                  <select multiple className="input-field" style={{ width: '100%', height: 110 }} value={edit.assign_users || []} onChange={e => setEdit({ ...edit, assign_users: [...e.target.selectedOptions].map(o => o.value) })}>
                    {employees.map(em => <option key={em.user_id} value={em.user_id}>{empName(em.user_id)}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setEdit(null)} className="btn-outline" style={{ flex: 1 }}>Отмена</button>
              <button onClick={saveTraining} style={{ ...ghostBtn, flex: 1, borderColor: 'var(--border-gold)', color: 'var(--accent-gold)' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default withAuth(LearnAdmin, { permission: 'can_review_tasks' })
