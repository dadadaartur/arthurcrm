import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

export default function ServiceDetail() {
  const router = useRouter()
  const { id } = router.query
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetchService(id)
  }, [id])

  async function fetchService(serviceId) {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single()
    if (error) console.error(error)
    else setService(data)
    setLoading(false)
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Загрузка...</div>
  if (!service) return <div className="text-center py-12 text-gray-500">Сервис не найден</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/" className="text-indigo-600 hover:underline mb-4 inline-block">← Назад в каталог</Link>
      <div className="bg-white rounded-xl p-6 shadow-sm mt-4">
        <div className="flex items-center mb-4">
          <img src={service.logo_url || '/placeholder.png'} alt={service.name} className="w-16 h-16 rounded-xl mr-4 object-cover" />
          <div>
            <h1 className="text-2xl font-bold">{service.name}</h1>
            <span className="text-indigo-600 text-sm bg-indigo-50 px-2 py-1 rounded-full">{service.category}</span>
          </div>
        </div>
        <p className="text-gray-700 mb-6">{service.description}</p>
        <div className="flex flex-wrap gap-4">
          <a href={service.website_url} target="_blank" rel="noopener" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition">
            Перейти на сайт
          </a>
          {service.referral_url && (
            <a href={service.referral_url} target="_blank" rel="noopener" className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition">
              🔗 Партнёрская ссылка
            </a>
          )}
        </div>
        <div className="mt-4 text-yellow-500">
          Рейтинг: {'★'.repeat(Math.round(service.rating))} {service.rating}
        </div>
      </div>
    </div>
  )
}
