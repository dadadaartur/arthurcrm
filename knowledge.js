// pages/knowledge.js
import BackArrow from '../components/BackArrow'
export default function KnowledgePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <BackArrow href="/" title="База знаний" />
      <div className="premium-card text-center py-16">
        <p className="text-gray-300 text-lg mb-2">Раздел в разработке</p>
        <p className="text-gray-500 text-sm">Скоро здесь будет база знаний компании: лучшие практики, инструкции и материалы.</p>
      </div>
    </div>
  )
}
