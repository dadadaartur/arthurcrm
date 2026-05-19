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

function ExternalLinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/" className="text-gray-500 hover:text-purple-500 transition mb-4 inline-block">
        ← Назад в каталог
      </Link>
      <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/40 mt-4">
        <div className="flex items-center mb-4">
          <img src={service.logo_url || '/placeholder.png'} alt={service.name} className="w-16 h-16 rounded-xl mr-4 object-cover border border-white" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{service.name}</h1>
            <span className="bg-gradient-to-r from-orange-500 via-yellow-400 to-purple-500 text-white text-xs px-3 py-1 rounded-full inline-block mt-1">
              {service.category}
            </span>
          </div>
        </div>
        <p className="text-gray-700 mb-6">{service.description}</p>
        <div className="flex flex-wrap gap-4">
          <a href={service.website_url} target="_blank" rel="noopener" className="btn-holographic">
            Перейти на сайт
          </a>
          {service.referral_url && (
            <a href={service.referral_url} target="_blank" rel="noopener" className="btn-holographic flex items-center gap-2">
              <ExternalLinkIcon />
              Партнёрская ссылка
            </a>
          )}
        </div>
        <div className="mt-4 flex items-center">
          {stars.map((filled, i) => (
            <Star key={i} filled={filled} />
          ))}
          <span className="text-gray-500 ml-2">{service.rating}</span>
        </div>
      </div>
    </div>
  )
}
