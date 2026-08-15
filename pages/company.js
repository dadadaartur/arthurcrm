// pages/company.js
import Link from 'next/link'
export default function CompanyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="group flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="rgba(249,115,22,.4)" strokeWidth="0.8" />
            <path d="M16.5 8.5L11 14l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: '#d4af37' }}>Моя компания</h1>
      </div>
      <div className="premium-card text-center py-16">
        <p className="text-gray-300 text-lg mb-2">Раздел в разработке</p>
        <p className="text-gray-500 text-sm">Скоро здесь появятся данные компании, новости, статистика и достижения.</p>
      </div>
    </div>
  )
}
