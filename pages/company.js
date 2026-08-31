// pages/company.js
import BackArrow from '../components/BackArrow'
export default function CompanyPage() {
  return (
    <div className="theme-light max-w-4xl mx-auto px-6 py-12">
      <BackArrow href="/" title="Моя компания" />
      <div className="premium-card text-center py-16">
        <p className="text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Раздел в разработке</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Скоро здесь появятся данные компании, новости, статистика и достижения.</p>
      </div>
    </div>
  )
}
