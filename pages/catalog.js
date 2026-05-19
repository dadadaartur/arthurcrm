import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import ServiceCard from '../components/ServiceCard'

export default function Catalog() {
  const [services, setServices] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ category: '', pricing: '', rating: 0 })

  async function fetchData() {
    setLoading(true)
    let query = supabase.from('services').select('*')
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.pricing) query = query.eq('pricing', filters.pricing)
    if (filters.rating > 0) query = query.gte('rating', filters.rating)
    query = query.order('rating', { ascending: false })

    const { data, error } = await query
    if (!error) setServices(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [filters])

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-light text-center mb-4 text-gray-700">
        Реестр{' '}
        <span className="font-semibold bg-gradient-to-r from-orange-500 via-yellow-400 to-purple-500 bg-clip-text text-transparent">
          AI
        </span>
      </h1>

      {/* Поиск */}
      <div className="max-w-md mx-auto mb-8">
        <input
          type="text"
          placeholder="Поиск по названию или описанию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-6 pr-4 py-3 input-magic text-gray-700 placeholder-gray-400"
        />
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap justify-center gap-3 mb-8 select-none">
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="btn-pill"
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
          className="btn-pill"
        >
          <option value="">Любая цена</option>
          <option value="Бесплатно">Бесплатно</option>
          <option value="Freemium">Freemium</option>
          <option value="Платно">Платно</option>
        </select>

        <select
          value={filters.rating}
          onChange={(e) => setFilters({ ...filters, rating: parseFloat(e.target.value) })}
          className="btn-pill"
        >
          <option value="0">Любой рейтинг</option>
          <option value="4">4+ звёзд</option>
          <option value="4.5">4.5+ звёзд</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center text-gray-400">Загрузка...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-gray-500">Ничего не найдено</p>
          )}
        </div>
      )}
    </div>
  )
}
