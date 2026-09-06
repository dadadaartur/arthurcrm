import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import BackArrow from '../../components/BackArrow'
import LoadingScreen from '../../components/LoadingScreen'
import { supabase } from '../../lib/supabaseClient'
import { useFeedback } from '../../context/ActionFeedbackContext'

export default function CreateJokeTask() {
  const router = useRouter()
  const { showSuccess, showError } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [colleagues, setColleagues] = useState([])
  const [form, setForm] = useState({ title: '', description: '', rewardKarma: 5, targetUserIds: [] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: me } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single()
      const { data: emps } = await supabase.from('profiles').select('user_id, first_name, last_name, display_name, email')
        .eq('company_id', me.company_id).eq('is_company_admin', false).is('deleted_at', null).neq('user_id', user.id)
      setColleagues(emps || [])
      setLoading(false)
    }
    load()
  }, [])

  const empName = e => [e.first_name, e.last_name].filter(Boolean).join(' ') || e.display_name || e.email
  const toggle = id => setForm(f => ({ ...f, targetUserIds: f.targetUserIds.includes(id) ? f.targetUserIds.filter(x => x !== id) : [...f.targetUserIds, id] }))

  const submit = async () => {
    if (!form.title.trim()) { showError('Придумайте название'); return }
    if (!form.targetUserIds.length) { showError('Выберите хотя бы одного коллегу'); return }
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch('/api/race/create-joke-task', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(form)
    })
    setSaving(false)
    const d = await r.json()
    if (r.ok) { showSuccess('Заявка отправлена админу на подтверждение'); router.push('/race') }
    else showError(d.error || 'Не удалось отправить заявку')
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="theme-light" style={{ minHeight: '100vh', padding: '40px 32px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <BackArrow href="/race" title="Шуточное задание коллегам" />
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
          Ваша привилегия победителя месячной гонки — придумайте что-то весёлое, небольшое и по-доброму. Награда ограничена небольшим числом кармиков намеренно, это развлечение, не замена обычных заданий. Перед публикацией заявку проверит админ компании.
        </p>

        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Название</label>
        <input className="input-field" style={{ width: '100%', marginBottom: 16 }} placeholder="Например: Спой строчку из любимой песни в общем чате" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />

        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Описание (необязательно)</label>
        <textarea className="input-field" style={{ width: '100%', marginBottom: 16 }} rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Награда, кармиков (до 15)</label>
        <input type="number" min="1" max="15" className="input-field" style={{ width: 120, marginBottom: 16 }} value={form.rewardKarma} onChange={e => setForm({ ...form, rewardKarma: e.target.value })} />

        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Кому</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24, padding: 12, borderRadius: 10, background: 'var(--bg-page)', maxHeight: 200, overflowY: 'auto' }}>
          {colleagues.map(c => {
            const checked = form.targetUserIds.includes(c.user_id)
            return (
              <label key={c.user_id} onClick={() => toggle(c.user_id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: checked ? 'rgba(184,134,11,0.1)' : 'var(--bg-card)', border: `1px solid ${checked ? 'var(--border-gold)' : 'var(--border-subtle)'}`, color: checked ? '#8a6208' : 'var(--text-primary)' }}>
                {empName(c)}
              </label>
            )
          })}
        </div>

        <button onClick={submit} disabled={saving} className="btn-gold" style={{ width: '100%' }}>{saving ? 'Отправляем…' : 'Отправить на подтверждение'}</button>
      </div>
    </div>
  )
}
