import Link from 'next/link'

function Star({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#fbbf24" : "#d1d5db"} stroke="#fbbf24" strokeWidth="1.5">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

export default function ServiceCard({ service }) {
  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(service.rating))
  const actionUrl = service.referral_url || service.website_url || '#'

  return (
    <div className="border border-white/40 rounded-2xl p-5 bg-white/60 backdrop-blur-md shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 h-full flex flex-col">
      <Link href={`/service/${service.id}`} className="flex items-center mb-3 cursor-pointer select-none">
        <img
          src={service.logo_url || '/placeholder.png'}
          alt={service.name}
          className="w-10 h-10 rounded-xl mr-3 object-cover border border-white"
        />
        <h3 className="font-semibold text-lg text-gray-800">{service.name}</h3>
      </Link>
      <p className="text-gray-600 text-sm flex-grow line-clamp-3 mb-3 select-none">
        {service.description}
      </p>
      <div className="flex justify-between items-center mt-auto">
        <span className="bg-gradient-to-r from-orange-500 via-yellow-400 to-purple-500 text-white text-xs px-3 py-1 rounded-full select-none">
          {service.category}
        </span>
        <span className="flex items-center gap-0.5 select-none">
          {stars.map((filled, i) => (
            <Star key={i} filled={filled} />
          ))}
          <span className="text-gray-500 text-sm ml-1">{service.rating}</span>
        </span>
      </div>
      <a
        href={actionUrl}
        target="_blank"
        rel="noopener"
        className="btn-holographic mt-4 text-center text-sm"
      >
        Начать!
      </a>
    </div>
  )
}
