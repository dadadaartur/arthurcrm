import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

function Star({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "#fbbf24" : "#d1d5db"} stroke="#fbbf24" strokeWidth="1.5">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

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

  if (loading) return <div className="text-center py-12 text-gray-400">Загрузка...</div>
  if (!service) return <div className="text-center py-12 text-gray-400">Сервис не найден</div>

  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(service.rating))
  const actionUrl = service.referral_url || service.website_url || '#'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/" className="text-gray-500 hover:text-purple-500 transition mb-4 inline-block select-none">
        ← Назад в каталог
      </Link>
      <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/40 mt-4">
        <div className="flex items-center mb-4 select-none">
          <img src={service.logo_url || '/placeholder.png'} alt={service.name} className="w-16 h-16 rounded-xl mr-4 object-cover border border-white" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{service.name}</h1>
            <span className="bg-gradient-to-r from-orange-500 via-yellow-400 to-purple-500 text-white text-xs px-3 py-1 rounded-full inline-block mt-1">
              {service.category}
            </span>
          </div>
        </div>
        <p className="text-gray-700 mb-6 select-none">{service.description}</p>
        <div className="flex flex-wrap gap-4">
          <a
            href={actionUrl}
            target="_blank"
            rel="noopener"
            className="btn-holographic"
          >
            Начать!
          </a>
        </div>
        <div className="mt-4 flex items-center select-none">
          {stars.map((filled, i) => (
            <Star key={i} filled={filled} />
          ))}
          <span className="text-gray-500 ml-2">{service.rating}</span>
        </div>
      </div>
    </div>
  )
}
