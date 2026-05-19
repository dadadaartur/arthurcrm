import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'

// Статичные вопросы-ответы (можно заменить выборкой из базы)
const QUICK_ACTIONS = [
  {
    question: 'Нужна уникальная картинка?',
    answer: 'Midjourney',
    serviceId: 2, // id вашего Midjourney в таблице services
  },
  {
    question: 'Хотите написать текст или статью?',
    answer: 'ChatGPT',
    serviceId: 1, // id ChatGPT
  },
  {
    question: 'Сгенерировать код моментально?',
    answer: 'GitHub Copilot',
    serviceId: 5,
  },
  {
    question: 'Создать презентацию за пару кликов?',
    answer: 'Gamma',
    serviceId: 4,
  },
  {
    question: 'Обработать видео как профи?',
    answer: 'Runway',
    serviceId: 6,
  },
  {
    question: 'Перевести текст на другой язык?',
    answer: 'DeepL',
    serviceId: 7,
  },
  {
    question: 'Создать музыку или трек?',
    answer: 'Suno',
    serviceId: 8,
  },
  {
    question: 'Оживить старое фото?',
    answer: 'Midjourney',
    serviceId: 2,
  },
]

export default function Home() {
  const [services, setServices] = useState([])

  useEffect(() => {
    // Загружаем все сервисы, чтобы получить реферальные ссылки
    supabase
      .from('services')
      .select('id, referral_url, website_url, name')
      .then(({ data }) => {
        if (data) setServices(data)
      })
  }, [])

  const getActionUrl = (serviceId) => {
    const service = services.find(s => s.id === serviceId)
    if (!service) return '#'
    return service.referral_url || service.website_url || '#'
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-12 select-none">
        <h1 className="text-5xl font-light text-gray-800 mb-4 tracking-wide">
          Волшебный мир{' '}
          <span className="font-semibold bg-gradient-to-r from-orange-500 via-yellow-400 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
            AI
          </span>
        </h1>
        <p className="text-gray-700 text-lg max-w-xl mx-auto bg-white/30 backdrop-blur-sm rounded-full py-2 px-6">
          Выберите задачу — получите идеальный инструмент
        </p>
      </div>

      {/* Сетка карточек-потребностей */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map((item, idx) => (
          <div key={idx} className="cloud-card flex flex-col items-center text-center">
            <p className="text-gray-700 font-medium mb-3">{item.question}</p>
            <a
              href={getActionUrl(item.serviceId)}
              target="_blank"
              rel="noopener"
              className="btn-holographic px-6 py-2 text-sm font-semibold"
            >
              {item.answer} — Начать!
            </a>
          </div>
        ))}
      </div>

      {/* Ссылка на реестр для сложного поиска */}
      <div className="mt-12 text-center">
        <Link href="/catalog" className="btn-pill text-gray-600 hover:text-purple-600">
          Или перейти в Реестр Ai для ручного поиска
        </Link>
      </div>
    </div>
  )
}
