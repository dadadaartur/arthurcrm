import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function Star({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#fbbf24" : "#d1d5db"} stroke="#fbbf24" strokeWidth="1.5">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

const SUGGESTIONS = [
  'Создать логотип',
  'Написать статью',
  'Сгенерировать код',
  'Оживить фото',
  'Сделать презентацию',
  'Обработать видео',
  'Перевести текст',
  'Создать музыку',
]

function highlightText(text, query) {
  if (!query.trim()) return <span>{text}</span>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="highlight-match">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [noResult, setNoResult] = useState(false)
  const [filters, setFilters] = useState({ category: '', pricing: '', rating: 0 })

  async function performSearch(q) {
    if (!q.trim()) return
    setQuery(q)
    setLoading(true)
    setNoResult(false)

    let dbQuery = supabase
      .from('services')
      .select('*')
      .or(`description.ilike.%${q}%,use_cases.ilike.%${q}%`)
      .order('rating', { ascending: false })
      .limit(20)

    if (filters.category) dbQuery = dbQuery.eq('category', filters.category)
    if (filters.pricing) dbQuery = dbQuery.eq('pricing', filters.pricing)
    if (filters.rating > 0) dbQuery = dbQuery.gte('rating', filters.rating)

    const { data, error } = await dbQuery
    if (error) console.error(error)
    setResults(data || [])
    setNoResult((data || []).length === 0)
    setLoading(false)
  }

  function handleTagClick(tag) {
    performSearch(tag)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return
    performSearch(query)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-10 select-none">
        <h1 className="text-4xl font-light text-gray-700 mb-3 tracking-wide cursor-default">
          Волшебный мир{' '}
          <span className="font-semibold bg-gradient-to-r from-orange-500 via-yellow-400 to-purple-500 bg-clip-text text-transparent">
            AI
          </span>
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto cursor-default">
          Просто скажите, что нужно сделать, и мы подберём лучшие инструменты. Не тратьте время на поиски — магия уже здесь.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-10 select-none">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => handleTagClick(suggestion)}
            className="tag-cloud bg-white/40 backdrop-blur-sm border border-white/50 rounded-full px-5 py-2 text-sm text-gray-700 shadow-sm hover:shadow-md hover:bg-white/60 transition-all cursor-pointer select-none"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-10">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <input
            type="text"
            placeholder="Опишите вашу задачу..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:flex-1 pl-6 pr-4 py-4 input-magic text-lg text-gray-700 placeholder-gray-400 rounded-full"
          />
          <button
            type="submit"
            className="btn-holographic flex items-center justify-center gap-2 px-8 py-4 w-full sm:w-auto"
          >
            Подобрать
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3 mb-8 select-none">
          <span className="text-sm text-gray-500 self-center mr-2">Фильтры:</span>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="filter-pill cursor-pointer"
          >
            <option value="">Все категории</option>
            <option value="Текст">Текст</option>
            <option value="Изображения">Изображения</option>
            <option value="Код">Код</option>
            <option value="Продуктивность">Продуктивность</option>
            <option value="Видео">Видео</option>
            <option value="Музыка">Музыка</option>
            <option value="Презентации">Презентации</option>
          </select>
          <select
            value={filters.pricing}
            onChange={(e) => setFilters({ ...filters, pricing: e.target.value })}
            className="filter-pill cursor-pointer"
          >
            <option value="">Любая цена</option>
            <option value="Бесплатно">Бесплатно</option>
            <option value="Freemium">Freemium</option>
            <option value="Платно">Платно</option>
          </select>
          <select
            value={filters.rating}
            onChange={(e) => setFilters({ ...filters, rating: parseFloat(e.target.value) })}
            className="filter-pill cursor-pointer"
          >
            <option value="0">Любой рейтинг</option>
            <option value="4">4+ звёзд</option>
            <option value="4.5">4.5+ звёзд</option>
          </select>
          <button onClick={() => performSearch(query)} className="filter-pill active">
            Применить
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-400 py-8 select-none">Ищем лучшие варианты...</div>
      )}
      {noResult && (
        <div className="text-center text-gray-500 py-8 select-none">
          Пока нет сервисов для этой задачи. Мы постоянно добавляем новые — загляните позже.
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h2 className="text-xl font-light mb-6 text-gray-600 select-none">
            Найдено {results.length} решений
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {results.map((service) => {
              const actionUrl = service.referral_url || service.website_url || '#'
              return (
                <div
                  key={service.id}
                  className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex items-start mb-4 select-none">
                    <img
                      src={service.logo_url || '/placeholder.png'}
                      alt={service.name}
                      className="w-12 h-12 rounded-xl mr-4 object-cover border border-white"
                    />
                    <div>
                      <h3 className="font-semibold text-lg text-gray-800">
                        {highlightText(service.name, query)}
                      </h3>
                      <span className="text-xs bg-gradient-to-r from-orange-500 via-yellow-400 to-purple-500 text-white px-2 py-0.5 rounded-full">
                        {service.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-3 select-none">
                    {highlightText(service.description, query)}
                  </p>

                  {service.use_cases && (
                    <div className="mb-4 select-none">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                        Ключевые возможности
                      </p>
                      <p className="text-sm text-gray-700">
                        {highlightText(service.use_cases, query)}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1 select-none">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} filled={i < Math.round(service.rating)} />
                      ))}
                      <span className="text-gray-500 text-sm ml-1">{service.rating}</span>
                    </div>

                    <a
                      href={actionUrl}
                      target="_blank"
                      rel="noopener"
                      className="text-sm btn-holographic px-4 py-1"
                    >
                      Начать!
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
