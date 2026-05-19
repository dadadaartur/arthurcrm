import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const CATEGORIES = [
  { value: 'daily', label: 'Ежедневное выполнение (+1..+5)', weight: 3 },
  { value: 'achievement', label: 'Достижение (+10..+30)', weight: 20 },
  { value: 'violation', label: 'Нарушение (-5..-50)', weight: -25 },
  { value: 'extra', label: 'Сверхурочная работа (+5..+15)', weight: 10 },
  { value: 'competition', label: 'Победа в соревновании (+20..+50)', weight: 35 },
]

export default function Admin() {
  const [user, setUser] = useState(null)
  const [targetEmail, setTargetEmail] = useState('')
  const [category, setCategory] = useState('daily')
  const [customAmount, setCustomAmount] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/login'
        return
      }
      supabase.from('admin_users').select('user_id').eq('user_id', user.id).single().then(({ data }) => {
        if (!data) window.location.href = '/'
        else setUser(user)
      })
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const amount = parseInt(customAmount)
    if (!targetEmail || !amount) return
    // Здесь должен быть код начисления, пока заглушка
    alert('Функция в разработке')
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="premium-card">
        <h1 className="text-xl font-bold text-deep-blue mb-4">Админ-панель</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email сотрудника"
            value={targetEmail}
            onChange={e => setTargetEmail(e.target.value)}
            className="input-field"
          />
          <select value={category} onChange={e => setCategory(e.target.value)} className="input-field">
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Сумма баллов"
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)}
            className="input-field"
          />
          <input
            type="text"
            placeholder="Описание (причина)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="input-field"
          />
          <button type="submit" className="btn-gold w-full">Начислить / Списать</button>
        </form>
      </div>
    </div>
  )
}
