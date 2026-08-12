import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'
import PremiumModal from '../components/PremiumModal'

const COLORS = {
  red: { label: 'Срочный фикс', bg: 'rgba(239, 68, 68, 0.85)', border: 'rgba(239, 68, 68, 0.9)', text: '#FFFFFF', shadow: '0 0 25px rgba(239, 68, 68, 0.5)' },
  yellow: { label: 'Срочно, но есть время', bg: 'rgba(234, 179, 8, 0.85)', border: 'rgba(234, 179, 8, 0.9)', text: '#FFFFFF', shadow: '0 0 25px rgba(234, 179, 8, 0.5)' },
  green: { label: 'Идея на будущее', bg: 'rgba(34, 197, 94, 0.85)', border: 'rgba(34, 197, 94, 0.9)', text: '#FFFFFF', shadow: '0 0 25px rgba(34, 197, 94, 0.5)' },
  blue: { label: 'Путь проекта', bg: 'rgba(59, 130, 246, 0.9)', border: 'rgba(59, 130, 246, 1)', text: '#FFFFFF', shadow: '0 0 30px rgba(59, 130, 246, 0.7)' },
}

const KB_TAGS = ['#архитектура', '#задача', '#заглушка', '#идея', '#интеграция', '#дизайн']

export default function Admin() {
  const [user, setUser] = useState(null)
  const [stickers, setStickers] = useState([])
  const [content, setContent] = useState('')
  const [color, setColor] = useState('blue')
  const [filter, setFilter] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  // Вкладки
  const [tab, setTab] = useState('backlog') // 'backlog' | 'knowledge'

  // База знаний
  const [kbEntries, setKbEntries] = useState([])
  const [kbContent, setKbContent] = useState('')
  const [kbTags, setKbTags] = useState([])
  const [kbFilter, setKbFilter] = useState([])
  const [editingKb, setEditingKb] = useState(null)

  // Компании и сотрудники (оставлены как есть)
  const [profiles, setProfiles] = useState([])
  const [roles, setRoles] = useState([])
  const [companies, setCompanies] = useState([])
  // ... (остальные состояния для приглашений, модалок и т.д. – не меняем)

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('roles(name, is_system)')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile?.roles?.is_system) { window.location.href = '/'; return }

      await fetchStickers()
      await fetchKbEntries()
      // ... (остальные fetch-функции)
    }
    checkAccess()
  }, [])

  async function fetchStickers() {
    const { data } = await supabase.from('admin_stickers').select('*').order('created_at', { ascending: false })
    setStickers(data || [])
    setLoading(false)
  }

  async function fetchKbEntries() {
    const { data } = await supabase
      .from('admin_stickers')
      .select('*')
      .ilike('content', '#%')
      .order('created_at', { ascending: false })
    setKbEntries(data || [])
  }

  async function createSticker(e) {
    e.preventDefault()
    if (!content.trim()) return
    await supabase.from('admin_stickers').insert({ user_id: user.id, content, color })
    setContent('')
    fetchStickers()
  }

  async function deleteSticker(id) {
    await supabase.from('admin_stickers').delete().eq('id', id)
    fetchStickers()
  }

  const toggleFilter = (c) => setFilter(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  const filteredStickers = filter.length === 0 ? stickers : stickers.filter(s => filter.includes(s.color))

  // --- База знаний ---
  async function createKbEntry(e) {
    e.preventDefault()
    if (!kbContent.trim()) return
    const fullContent = `${kbTags.join(' ')} ${kbContent}`
    await supabase.from('admin_stickers').insert({ user_id: user.id, content: fullContent, color: 'blue' })
    setKbContent('')
    setKbTags([])
    fetchKbEntries()
  }

  async function deleteKbEntry(id) {
    await supabase.from('admin_stickers').delete().eq('id', id)
    fetchKbEntries()
  }

  const toggleKbTag = (tag) => {
    setKbTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const toggleKbFilter = (tag) => {
    setKbFilter(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const filteredKb = kbFilter.length === 0
    ? kbEntries
    : kbEntries.filter(entry => kbFilter.some(tag => entry.content.includes(tag)))

  // ... (остальные функции для компаний, сотрудников, модалок – оставляем без изменений)

  if (loading) return <div className="flex justify-center items-center py-8"><Spinner /></div>

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Вкладки */}
      <div className="flex gap-4 mb-8">
        <button onClick={() => setTab('backlog')} className={`filter-pill ${tab === 'backlog' ? 'active' : ''}`}>
          Беклог
        </button>
        <button onClick={() => setTab('knowledge')} className={`filter-pill ${tab === 'knowledge' ? 'active' : ''}`}>
          База знаний
        </button>
      </div>

      {tab === 'backlog' && (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Левая колонка */}
          <div className="w-full lg:w-1/3">
            <div className="card-lumen mb-6">
              <h3>Дашборд</h3>
              {/* ... */}
            </div>
            <div className="card-lumen mb-6">
              <h3>Фильтры</h3>
              <div className="flex flex-wrap gap-2 mt-4">
                {Object.entries(COLORS).map(([key, val]) => (
                  <button key={key} onClick={() => toggleFilter(key)} className={`filter-pill ${filter.includes(key) ? 'active' : ''}`}
                    style={filter.includes(key) ? { background: val.border, color: 'white', borderColor: 'transparent' } : {}}>
                    {val.label}
                  </button>
                ))}
              </div>
            </div>
            {/* ... (компании, сотрудники) */}
          </div>
          {/* Правая колонка (стикеры) */}
          <div className="flex-1">
            {/* Форма создания */}
            <div className="card-lumen mb-6">
              <h3>Новый стикер</h3>
              <form onSubmit={createSticker} className="space-y-4 mt-4">
                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Опишите задачу или идею..." className="input-field" rows={3} required />
                <div className="flex gap-3 items-center">
                  <select value={color} onChange={e => setColor(e.target.value)} className="input-field w-auto">
                    <option value="red">🔴 Срочный фикс</option>
                    <option value="yellow">🟡 Срочно, но есть время</option>
                    <option value="green">🟢 Идея на будущее</option>
                    <option value="blue">🔵 Путь проекта</option>
                  </select>
                  <button type="submit" className="btn-lumen">Создать</button>
                </div>
              </form>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredStickers.map(sticker => {
                const style = COLORS[sticker.color]
                const isExpanded = expanded[sticker.id]
                const longText = sticker.content.length > 120
                const displayText = isExpanded || !longText ? sticker.content : sticker.content.slice(0, 120) + '...'
                return (
                  <div key={sticker.id} className="premium-card relative flex flex-col" style={{ background: style.bg, borderColor: style.border, boxShadow: style.shadow, color: style.text }}>
                    <p className="text-sm whitespace-pre-wrap flex-1 sticker-text">{displayText}</p>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-xs opacity-70">{new Date(sticker.created_at).toLocaleString('ru')}</span>
                      <div className="flex gap-2">
                        {longText && <button onClick={() => toggleExpand(sticker.id)} className="text-xs opacity-80 hover:opacity-100 transition">{isExpanded ? 'Свернуть' : 'Далее'}</button>}
                        <button onClick={() => deleteSticker(sticker.id)} className="text-xs text-red-300 hover:text-red-200 transition">Удалить</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'knowledge' && (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/3">
            <div className="card-lumen mb-6">
              <h3>Фильтры по тегам</h3>
              <div className="flex flex-wrap gap-2 mt-4">
                {KB_TAGS.map(tag => (
                  <button key={tag} onClick={() => toggleKbFilter(tag)} className={`filter-pill ${kbFilter.includes(tag) ? 'active' : ''}`}
                    style={kbFilter.includes(tag) ? { background: '#4B5563', color: 'white', borderColor: 'transparent' } : {}}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="card-lumen mb-6">
              <h3>Новая запись в базу знаний</h3>
              <form onSubmit={createKbEntry} className="space-y-4 mt-4">
                <textarea value={kbContent} onChange={e => setKbContent(e.target.value)} placeholder="Описание технического решения, заглушки или идеи..." className="input-field" rows={4} required />
                <div className="flex flex-wrap gap-2">
                  {KB_TAGS.map(tag => (
                    <button key={tag} type="button" onClick={() => toggleKbTag(tag)} className={`filter-pill ${kbTags.includes(tag) ? 'active' : ''}`}
                      style={kbTags.includes(tag) ? { background: '#4B5563', color: 'white', borderColor: 'transparent' } : {}}>
                      {tag}
                    </button>
                  ))}
                </div>
                <button type="submit" className="btn-lumen">Добавить в базу</button>
              </form>
            </div>
            <div className="space-y-4">
              {filteredKb.map(entry => {
                const contentWithoutTags = entry.content.replace(/#\S+/g, '').trim()
                const tags = entry.content.match(/#\S+/g) || []
                return (
                  <div key={entry.id} className="premium-card relative flex flex-col" style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)', boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)', color: '#FFFFFF' }}>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {tags.map(tag => (
                        <span key={tag} className="text-xs bg-[var(--lumen-surface-2)] px-2 py-0.5 rounded-full text-[var(--lumen-ink-soft)]">{tag}</span>
                      ))}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{contentWithoutTags}</p>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-xs opacity-70">{new Date(entry.created_at).toLocaleString('ru')}</span>
                      <button onClick={() => deleteKbEntry(entry.id)} className="text-xs text-red-300 hover:text-red-200">Удалить</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
