import { useEffect, useState } from 'react'
import BackArrow from '../../components/BackArrow'
import LoadingScreen from '../../components/LoadingScreen'
import { supabase } from '../../lib/supabaseClient'
import { withAuth } from '../../components/withAuth'
import { useFeedback } from '../../context/ActionFeedbackContext'

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

function ChampionshipSettings() {
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [months, setMonths] = useState([3, 6, 9, 12])
  const [saving, setSaving] = useState(false)

  const auth = async () => { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session.access_token}` } }
  useEffect(() => {
    const load = async () => {
      const h = await auth()
      const r = await fetch('/api/company-admin/championship-settings', { headers: h })
      if (r.ok) { const d = await r.json(); setMonths(d.season?.checkpoint_months || [3, 6, 9, 12]) }
      setLoading(false)
    }
    load()
  }, [])

  const toggleMonth = (m) => setMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a, b) => a - b))

  const save = async () => {
    if (months.length === 0) { showError('Выберите хотя бы одну контрольную точку'); return }
    setSaving(true)
    const h = await auth()
    const r = await fetch('/api/company-admin/championship-settings', { method: 'PUT', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ checkpointMonths: months }) })
    setSaving(false)
    if (r.ok) showSuccess('Правила лиги сохранены')
    else showError('Не удалось сохранить')
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="theme-light" style={{ minHeight: '100vh', padding: '40px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <BackArrow href="/championship" title="Настройка правил чемпионата" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 18, padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>Контрольные точки лиги</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 16px' }}>В конце выбранных месяцев подводятся промежуточные итоги года — топ-3 получают приз, счёт сезона продолжает идти дальше.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
              {MONTHS.map((label, i) => {
                const m = i + 1, active = months.includes(m)
                return (
                  <button key={m} onClick={() => toggleMonth(m)} style={{ padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${active ? 'var(--border-gold)' : 'var(--border-subtle)'}`, background: active ? 'rgba(234,88,12,0.1)' : 'var(--bg-page)', color: active ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>{label}</button>
                )
              })}
            </div>
            <button onClick={save} disabled={saving} className="btn-glass" style={{ padding: '10px 24px', fontSize: 13 }}>{saving ? 'Сохраняем…' : 'Сохранить'}</button>
          </div>

          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 18, padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>Кубок</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 16px' }}>Размер сетки, длительность раунда и участники настраиваются при создании каждого турнира — не общее правило на всё время, а выбор под конкретный запуск.</p>
            <a href="/championship" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent-gold)', textDecoration: 'none' }}>Перейти к созданию кубка →</a>
          </div>

          <div style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', borderRadius: 18, padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>Гонка месяца</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Правила фиксированы — обнуление 1 числа, топ-3 получают привилегию шуточных заданий. Настройка призов для топ-3 — в разделе выигранных призов.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
export default withAuth(ChampionshipSettings, { permission: 'can_manage_employees' })
