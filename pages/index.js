import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import ServiceCard from '../ServiceCard'
import SearchBar from '../SearchBar'

export default function Home() {
  const [services, setServices] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchServices()
  }, [])

  async function fetchServices() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('rating', { ascending: false })
    if (error) console.error('Error fetching services:', error)
    else setServices(data)
    setLoading(false)
  }

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Каталог ИИ-решений
      </h1>
      <SearchBar search={search} setSearch={setSearch} />
      
      {loading ? (
        <div className="text-center text-gray-500">Загрузка...</div>
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
