import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'

const COLORS = {
  red: { label: 'Срочный фикс', bg: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.6)', shadow: '0 0 15px rgba(239,68,68,0.3)' },
  yellow: { label: 'Срочно, но есть время', bg: 'rgba(234,179,8,0.2)', border: 'rgba(234,179,8,0.6)', shadow: '0 0 15px rgba(234,179,8,0.3)' },
  green: { label: 'Идея на будущее', bg: 'rgba(34,197,94,0.2)', border: 'rgba(34,197,94,0.6)', shadow: '0 0 15px rgba(34,197,94,0.3)' },
}

export default function Admin() {
  const [user, setUser] = useState(null)
  const [stickers, setStickers] = useState([])
  const [content, setContent] = useState('')
  const [color, setColor] = useState('green')
  const [filter, setFilter] = useState([]) // массив выбранных цветов
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)
      fetchStickers()
    }
    checkUser()
  }, [])

  async function fetchStickers() {
    const { data } = await supabase
      .from('admin_stickers')
      .select('*')
      .order('created_at', { ascending: false })
    setStickers(data || [])
    setLoading(false)
  }

  async function createSticker(e) {
    e.preventDefault()
    if (!content.trim()) return
    const { error } = await supabase.from('admin_stickers').insert({
      user_id: user.id,
      content,
      color,
    })
    if (!error) {
      setContent('')
      fetchStickers()
    }
  }

  async function deleteSticker(id) {
    await supabase.from('admin_stickers').delete().eq('id', id)
    fetchStickers()
  }

  const toggleFilter = (c) => {
    setFilter(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  const filtered = filter.length === 0 ? stickers : stickers.filter(s => filter.includes(s.color))

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Левая колонка: дашборд */}
        <div className="w-full lg:w-1/3">
          <div className="dash-card mb-6">
            <h3>Дашборд компании</h3>
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-sm text-gray-400">Сотрудников</p>
                <p className="text-2xl font-bold text-white">13</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Активных задач</p>
                <p className="text-2xl font-bold text-yellow-400">{stickers.filter(s => s.color === 'red').length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Срочных</p>
                <p className="text-2xl font-bold text-red-400">{stickers.filter(s => s.color === 'red').length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Идей</p>
                <p className="text-2xl font-bold text-green-400">{stickers.filter(s => s.color === 'green').length}</p>
              </div>
              <div className="border-t border-gray-700 pt-4 mt-4">
                <p className="text-xs text-gray-500">Роли: РОП (1), СМ (2), МОП (10)</p>
              </div>
            </div>
          </div>

          {/* Фильтры */}
          <div className="dash-card">
            <h3>Фильтры</h3>
            <div className="flex flex-wrap gap-2 mt-4">
              {Object.entries(COLORS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => toggleFilter(key)}
                  className={`filter-pill ${filter.includes(key) ? 'active' : ''}`}
                  style={filter.includes(key) ? { background: val.border, color: 'white', borderColor: 'transparent' } : {}}
                >
                  {val.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Правая колонка: стикеры и создание */}
        <div className="flex-1">
          {/* Форма создания */}
          <div className="dash-card mb-6">
            <h3>Новый стикер</h3>
            <form onSubmit={createSticker} className="space-y-4 mt-4">
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Опишите задачу или идею..."
                className="input-field"
                rows={3}
                required
              />
              <div className="flex gap-3 items-center">
                <select value={color} onChange={e => setColor(e.target.value)} className="input-field w-auto">
                  <option value="red">🔴 Срочный фикс</option>
                  <option value="yellow">🟡 Срочно, но есть время</option>
                  <option value="green">🟢 Идея на будущее</option>
                </select>
                <button type="submit" className="btn-gold">Создать</button>
              </div>
            </form>
          </div>

          {/* Сетка стикеров */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(sticker => {
              const style = COLORS[sticker.color]
              return (
                <div
                  key={sticker.id}
                  className="premium-card relative"
                  style={{
                    background: style.bg,
                    borderColor: style.border,
                    boxShadow: style.shadow,
                  }}
                >
                  <p className="text-white text-sm whitespace-pre-wrap">{sticker.content}</p>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-xs text-gray-400">{new Date(sticker.created_at).toLocaleString('ru')}</span>
                    <button
                      onClick={() => deleteSticker(sticker.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
