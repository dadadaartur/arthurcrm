import { useEffect, useState } from 'react'
import DatePicker from '../../components/DatePicker'
import { supabase } from '../../lib/supabaseClient'
import LoadingScreen from '../../components/LoadingScreen'
import BackArrow from '../../components/BackArrow'
import ProgressBar3D from '../../components/ProgressBar3D'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const CATEGORIES = [
  { key: 'financial', label: 'Финансовые', color: '#8a6208' },
  { key: 'operational', label: 'Операционные', color: '#0e7490' },
  { key: 'quality', label: 'Качество', color: '#137a39' },
  { key: 'development', label: 'Развитие команды', color: '#7c3aed' },
  { key: 'innovation', label: 'Инновации', color: '#db2777' },
  { key: 'culture', label: 'Культура', color: '#be123c' },
  { key: 'strategic', label: 'Стратегические', color: '#475569' },
]
const PERIODS = [
  { key: 'week', label: 'Неделя' }, { key: 'month', label: 'Месяц' }, { key: 'quarter', label: 'Квартал' }, { key: 'year', label: 'Год' }
]
const TEMPLATES = [
  { title: 'Выполнить план продаж', category: 'financial', metric: 'Сумма выручки', target_value: 1000000, unit: 'руб', period: 'month' },
  { title: 'Удержать клиентов', category: 'quality', metric: 'Индекс удовлетворённости (NPS)', target_value: 80, unit: '%', period: 'quarter' },
  { title: 'Нарастить базу лидов', category: 'operational', metric: 'Новые лиды', target_value: 500, unit: 'шт', period: 'month' },
  { title: 'Провести обучение команды', category: 'development', metric: 'Сотрудников прошли обучение', target_value: 100, unit: '%', period: 'quarter' },
  { title: 'Снизить время ответа клиенту', category: 'quality', metric: 'Среднее время ответа', target_value: 15, unit: 'мин', period: 'week' },
  { title: 'Годовая цель по росту компании', category: 'strategic', metric: '% роста к прошлому году', target_value: 30, unit: '%', period: 'year' },
]
const ghostBtn = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-gold)', borderRadius: 12,
  padding: '10px 22px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, transition: 'all .25s'
}
const hoverOn = e => { e.currentTarget.style.borderColor = '#8a6208'; e.currentTarget.style.boxShadow = '0 0 14px rgba(138,98,8,0.18)'; e.currentTarget.style.transform = 'translateY(-1px)' }
const hoverOff = e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }
const pill = a => ({
  padding: '7px 16px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
  background: a ? 'rgba(184,134,11,0.12)' : 'var(--bg-card)',
  border: `1px solid ${a ? 'var(--border-gold)' : 'var(--border-subtle)'}`,
  color: a ? '#8a6208' : 'var(--text-secondary)', fontWeight: a ? 700 : 400, transition: 'all 0.2s'
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
    <div className="theme-light" style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <BackArrow href="/company-admin" title="Глобальные цели" />

        {/* Создание */}
        <div style={{ maxWidth: 820, background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 28, border: '1px solid var(--border-subtle)', marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>Новая глобальная цель</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>Можно начать с готового шаблона (заполнит поля ниже, дальше можно поправить) или заполнить вручную.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {TEMPLATES.map((t, i) => (
              <button key={i} type="button" onClick={() => setForm(f => ({ ...f, ...t }))}
                style={{ fontSize: 11, padding: '6px 14px', borderRadius: 20, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.3)', color: '#7c3aed', cursor: 'pointer' }}>
                {t.title}
              </button>
            ))}
          </div>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Название</label>
                <input className="input-field" style={{ width: '100%' }} placeholder="Увеличить выручку на 15% за квартал" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Категория</label>
                <select className="input-field" style={{ width: '100%' }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Период</label>
                <select className="input-field" style={{ width: '100%' }} value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
                  {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Пример измерения</label>
                <input className="input-field" style={{ width: '100%' }} placeholder="Сумма выручки, % выполнения, NPS" value={form.metric} onChange={e => setForm({ ...form, metric: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Целевое значение</label>
                <input type="number" step="0.1" className="input-field" style={{ width: '100%' }} value={form.target_value} onChange={e => setForm({ ...form, target_value: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Единица</label>
                <select className="input-field" style={{ width: '100%' }} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  <option value="%">%</option><option value="шт">шт</option><option value="руб">руб</option><option value="балл">балл</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Дедлайн</label>
                <DatePicker value={form.deadline} onChange={v => setForm({ ...form, deadline: v })} placeholder="Без срока" />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Описание</label>
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
            <div style={{ gridColumn: '1 / -1', background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 20, padding: 60, textAlign: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
              Глобальных целей пока нет
            </div>
          )}
          {filtered.map(g => {
            const cat = CATEGORIES.find(c => c.key === g.category) || CATEGORIES[0]
            const pct = g.target_value > 0 ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0
            return (
              <div key={g.id} style={{
                background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 16, padding: 20,
                border: '1px solid var(--border-subtle)', transition: 'border-color 0.25s',
                display: 'flex', flexDirection: 'column', gap: 12
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `${cat.color}66`}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: 1, background: `${cat.color}18`, color: cat.color, border: `1px solid ${cat.color}44`, whiteSpace: 'nowrap' }}>{cat.label}</span>
                  <button onClick={() => handleDelete(g.id)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 11, cursor: 'pointer' }}>Удалить</button>
                </div>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 15 }}>{g.title}</div>
                  {g.description && <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>{g.description}</div>}
                  {g.metric && <div style={{ color: '#0e7490', fontSize: 11, marginTop: 6 }}>Измерение: {g.metric}</div>}
                </div>
                <div>
                  <ProgressBar3D value={g.current_value} marks={[{ key: 't', value: g.target_value }]} unit={g.unit} height={12} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginTop: 5 }}>
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
