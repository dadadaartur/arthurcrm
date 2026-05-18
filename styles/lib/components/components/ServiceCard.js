import Link from 'next/link'

export default function ServiceCard({ service }) {
  return (
    <Link href={`/service/${service.id}`}>
      <div className="border rounded-xl p-5 hover:shadow-lg transition-shadow bg-white cursor-pointer h-full flex flex-col">
        <div className="flex items-center mb-3">
          <img
            src={service.logo_url || '/placeholder.png'}
            alt={service.name}
            className="w-10 h-10 rounded-lg mr-3 object-cover"
          />
          <h3 className="font-semibold text-lg text-gray-800">{service.name}</h3>
        </div>
        <p className="text-gray-600 text-sm flex-grow line-clamp-3 mb-3">
          {service.description}
        </p>
        <div className="flex justify-between items-center mt-auto">
          <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full">
            {service.category}
          </span>
          <span className="text-yellow-500 text-sm">
            {'★'.repeat(Math.round(service.rating))}{' '}
            <span className="text-gray-400">{service.rating}</span>
          </span>
        </div>
      </div>
    </Link>
  )
}
