import { useEffect, useState } from 'react'
import DatePicker from '../../components/DatePicker'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import ProgressBar3D from '../../components/ProgressBar3D'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const CATEGORIES = [
  { key: 'financial', label: 'Финансовые', color: '#FFD700' },
  { key: 'operational', label: 'Операционные', color: '#a0e9ff' },
  { key: 'quality', label: 'Качество', color: '#4ade80' },
  { key: 'development', label: 'Развитие команды', color: '#c084fc' },
  { key: 'innovation', label: 'Инновации', color: '#ffb3c6' },
  { key: 'culture', label: 'Культура', color: '#fda4af' },
  { key: 'strategic', label: 'Стратегические', color: '#e2e8f0' },
]
const PERIODS = [
  { key: 'month', label: 'Месяц' }, { key: 'quarter', label: 'Квартал' }, { key: 'year', label: 'Год' }
]
const ghostBtn = {
  background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12,
  padding: '10px 22px', color: '#fff', cursor: 'pointer', fontSize: 13, transition: 'all .25s'
}
const hoverOn = e => { e.currentTarget.style.borderColor = '#FFD700'; e.currentTarget.style.boxShadow = '0 0 14px rgba(255,215,0,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.3)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }
const pill = a => ({
  padding: '7px 16px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
  background: a ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.04)',
  border: `1px solid ${a ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.12)'}`,
  color: a ? '#FFD700' : '#aaa', fontWeight: a ? 700 : 400, transition: 'all 0.2s'
})

function GlobalGoals() {
  const { showSuccess, showError } = useFeedback()
  const [companyId, setCompanyId] = useState(null)
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({ title: '', category: 'financial', description: '', metric: '', target_value: 100, unit: '%', period: 'quarter', deadline: '' })
  const [editingProgress, setEditingProgress] = useState({})

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: prof } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      if (!prof) { window.location.href = '/'; return }
      setCompanyId(prof.company_id)
      await load(prof.company_id)
      setLoading(false)
    }
    init()
  }, [])

  const load = async (cid) => {
    const { data } = await supabase.from('global_goals').select('*')
      .eq('company_id', cid).eq('is_active', true).order('created_at', { ascending: false })
    setGoals(data || [])
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { showError('Укажите название цели'); return }
    const { error } = await supabase.from('global_goals').insert({
      company_id: companyId, title: form.title, category: form.category,
      description: form.description, metric: form.metric,
      target_value: Number(form.target_value) || 0, unit: form.unit,
      period: form.period, deadline: form.deadline || null
    })
    if (error) { showError('Ошибка создания: ' + error.message); return }
    showSuccess('Глобальная цель создана')
    setForm({ title: '', category: 'financial', description: '', metric: '', target_value: 100, unit: '%', period: 'quarter', deadline: '' })
    load(companyId)
  }

  const saveProgress = async (goal) => {
    const val = editingProgress[goal.id]
    if (val === undefined || val === '') { showError('Введите значение'); return }
    const { error } = await supabase.from('global_goals').update({ current_value: Number(val) }).eq('id', goal.id)
    if (error) { showError('Ошибка сохранения'); return }
    showSuccess('Прогресс обновлён')
    setEditingProgress(p => ({ ...p, [goal.id]: undefined }))
    load(companyId)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('global_goals').update({ is_active: false }).eq('id', id)
    if (!error) { showSuccess('Цель удалена'); load(companyId) } else showError('Ошибка удаления')
  }

  if (loading) return <LoadingScreen />
  const filtered = filter === 'all' ? goals : goals.filter(g => g.category === filter)

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Глобальные цели" />

        {/* Создание */}
        <div style={{ background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 18, color: '#fff' }}>Новая глобальная цель</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Название</label>
                <input className="input-field" style={{ width: '100%' }} placeholder="Увеличить выручку на 15% за квартал" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Категория</label>
                <select className="input-field" style={{ width: '100%' }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Период</label>
                <select className="input-field" style={{ width: '100%' }} value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
                  {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Пример измерения</label>
                <input className="input-field" style={{ width: '100%' }} placeholder="Сумма выручки, % выполнения, NPS" value={form.metric} onChange={e => setForm({ ...form, metric: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Целевое значение</label>
                <input type="number" step="0.1" className="input-field" style={{ width: '100%' }} value={form.target_value} onChange={e => setForm({ ...form, target_value: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Единица</label>
                <select className="input-field" style={{ width: '100%' }} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  <option value="%">%</option><option value="шт">шт</option><option value="руб">руб</option><option value="балл">балл</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Дедлайн</label>
                <DatePicker value={form.deadline} onChange={v => setForm({ ...form, deadline: v })} placeholder="Без срока" />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Описание</label>
                <textarea className="input-field" style={{ width: '100%' }} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div style={{ gridColumn: 'span 4' }}>
                <button type="submit" style={ghostBtn} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Создать цель</button>
              </div>
            </div>
          </form>
        </div>

        {/* Фильтр по категориям */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('all')} style={pill(filter === 'all')}>Все</button>
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setFilter(c.key)} style={pill(filter === c.key)}>{c.label}</button>
          ))}
        </div>

        {/* Список целей */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', background: 'rgba(15,20,35,0.85)', borderRadius: 20, padding: 60, textAlign: 'center', color: '#777', border: '1px solid rgba(255,255,255,0.06)' }}>
              Глобальных целей пока нет
            </div>
          )}
          {filtered.map(g => {
            const cat = CATEGORIES.find(c => c.key === g.category) || CATEGORIES[0]
            const pct = g.target_value > 0 ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0
            return (
              <div key={g.id} style={{
                background: 'rgba(15,20,35,0.85)', backdropFilter: 'blur(14px)', borderRadius: 16, padding: 20,
                border: '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.25s',
                display: 'flex', flexDirection: 'column', gap: 12
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `${cat.color}66`}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1, background: `${cat.color}18`, color: cat.color, border: `1px solid ${cat.color}44`, whiteSpace: 'nowrap' }}>{cat.label}</span>
                  <button onClick={() => handleDelete(g.id)} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 11, cursor: 'pointer' }}>Удалить</button>
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{g.title}</div>
                  {g.description && <div style={{ color: '#888', fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>{g.description}</div>}
                  {g.metric && <div style={{ color: '#a0e9ff', fontSize: 11, marginTop: 6 }}>Измерение: {g.metric}</div>}
                </div>
                <div>
                  <ProgressBar3D value={g.current_value} marks={[{ key: 't', value: g.target_value }]} unit={g.unit} height={12} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginTop: 5 }}>
                    <span>Сейчас: {g.current_value}{g.unit}</span>
                    <span>Цель: {g.target_value}{g.unit} · {pct}%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  <input type="number" step="0.1" placeholder="Новое значение" className="input-field" style={{ flex: 1 }}
                    value={editingProgress[g.id] ?? ''} onChange={e => setEditingProgress(p => ({ ...p, [g.id]: e.target.value }))} />
                  <button onClick={() => saveProgress(g)} style={{ ...ghostBtn, padding: '8px 16px', fontSize: 12, whiteSpace: 'nowrap' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>Обновить</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
export default withAuth(GlobalGoals, { permission: 'can_review_tasks' })
