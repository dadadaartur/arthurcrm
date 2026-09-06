// pages/knowledge.js
import BackArrow from '../components/BackArrow'
export default function KnowledgePage() {
  return (
    <div className="theme-light max-w-4xl mx-auto px-6 py-12">
      <BackArrow href="/" title="База знаний" />
      <div className="premium-card text-center py-16">
        <p className="text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Раздел в разработке</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Скоро здесь будет база знаний компании: лучшие практики, инструкции и материалы.</p>
      </div>
    </div>
  )
}
