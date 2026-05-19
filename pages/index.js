import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

// Облака-вопросы (serviceId должен совпадать с id в таблице services)
const QUICK_ACTIONS = [
  {
    question: 'Хочешь написать музыкальный хит за 5 минут?',
    answer: 'Suno',
    serviceId: 8,
  },
  {
    question: 'Нужна уникальная картинка или логотип?',
    answer: 'Midjourney',
    serviceId: 2,
  },
  {
    question: 'Сгенерировать код за секунды?',
    answer: 'GitHub Copilot',
    serviceId: 5,
  },
  {
    question: 'Сделать презентацию проще простого?',
    answer: 'Gamma',
    serviceId: 4,
  },
  {
    question: 'Стать режиссёром клипа или фильма?',
    answer: 'Runway',
    serviceId: 6,
  },
  {
    question: 'Перевести текст на любой язык мгновенно?',
    answer: 'DeepL',
    serviceId: 7,
  },
  {
    question: 'Оживить старое фото?',
    answer: 'Midjourney',
    serviceId: 2,
  },
  {
    question: 'Написать статью или книгу без усилий?',
    answer: 'ChatGPT',
    serviceId: 1,
  },
]

export default function Home() {
  const [services, setServices] = useState([])

  useEffect(() => {
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

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map((item, idx) => (
          <div key={idx} className="floating-cloud flex flex-col items-center text-center">
            <p className="text-gray-700 font-medium mb-4">{item.question}</p>
            <a
              href={getActionUrl(item.serviceId)}
              target="_blank"
              rel="noopener"
              className="btn-holographic px-6 py-2 text-sm font-semibold"
            >
              Попробовать {item.answer}
            </a>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <a
          href="/catalog"
          className="cloud inline-block px-8 py-3 text-gray-700 hover:text-purple-600 transition font-medium"
        >
          Открыть полный Реестр AI
        </a>
      </div>
    </div>
  )
}
