import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'

// SVG-звезда
function Star({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#fbbf24" : "#d1d5db"} stroke="#fbbf24" strokeWidth="1.5">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

// Иконка поиска (SVG)
function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

// Иконка для кнопки "Подобрать"
function MagicWand() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="4.5 1.5 3 5 0 6.5 3 8 4.5 11.5 6 8 9 6.5 6 5" />
      <line x1="11" y1="17" x2="19" y2="9" />
      <line x1="16.5" y1="14.5" x2="18.5" y2="16.5" />
    </svg>
  )
}

export default function Match() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [noResult, setNoResult] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setNoResult(false)

    // Поиск по описанию и use_cases
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .or(`description.ilike.%${query}%,use_cases.ilike.%${query}%`)
      .order('rating', { ascending: false })
      .limit(10)

    if (error) console.error(error)
    setResults(data || [])
    setNoResult((data || []).length === 0)
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-light text-center mb-4 text-gray-700">
        Какая задача стоит перед вами?
      </h1>
      <p className="text-center text-gray-500 mb-8">
        Опишите, что нужно сделать, и мы подберём лучшие ИИ-решения
      </p>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto mb-12">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Например: создать логотип, написать статью..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/60 backdrop-blur-md border border-white/60 rounded-full shadow-lg focus:ring-2 focus:ring-green-300 focus:border-transparent text-gray-700 placeholder-gray-400"
          />
          <button
            type="submit"
            className="btn-holographic absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-6"
          >
            <MagicWand />
            Подобрать
          </button>
        </div>
      </form>

      {loading && (
        <div className="text-center text-gray-400">Ищем лучшие варианты...</div>
      )}

      {noResult && (
        <div className="text-center text-gray-500">
          Пока нет сервисов для этой задачи. Мы постоянно добавляем новые — загляните позже.
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h2 className="text-xl font-light mb-6 text-gray-600">
            Найдено {results.length} решений
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {results.map((service) => (
              <div
                key={service.id}
                className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-6 shadow-lg"
              >
                <div className="flex items-start mb-4">
                  <img
                    src={service.logo_url || '/placeholder.png'}
                    alt={service.name}
                    className="w-12 h-12 rounded-xl mr-4 object-cover border border-white"
                  />
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800">
                      {service.name}
                    </h3>
                    <span className="text-xs bg-gradient-to-r from-yellow-400 to-green-400 text-white px-2 py-0.5 rounded-full">
                      {service.category}
                    </span>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                  {service.description}
                </p>

                {service.use_cases && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                      Ключевые возможности
                    </p>
                    <p className="text-sm text-gray-700">
                      {service.use_cases}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        filled={i < Math.round(service.rating)}
                      />
                    ))}
                    <span className="text-gray-500 text-sm ml-1">
                      {service.rating}
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <a
                      href={service.website_url}
                      target="_blank"
                      rel="noopener"
                      className="text-sm btn-holographic px-4 py-1"
                    >
                      Подробнее
                    </a>
                    {service.referral_url && (
                      <a
                        href={service.referral_url}
                        target="_blank"
                        rel="noopener"
                        className="text-sm border border-green-400 text-green-600 px-4 py-1 rounded-full hover:bg-green-50 transition"
                      >
                        Попробовать
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
