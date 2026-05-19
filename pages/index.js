import { useState } from 'react'

// Первый вопрос
const FIRST_QUESTION = 'Кто вы? Чем мы можем помочь?'

// Варианты первого шага (ключ = id ветки)
const FIRST_CHOICES = [
  {
    id: 'newbie',
    label: '🧑‍💻 Хочу узнать о возможностях AI (новичок)',
  },
  {
    id: 'specific',
    label: '🎯 Есть конкретная задача (дизайнер, писатель...)',
  },
  {
    id: 'explorer',
    label: '🌼 Просто интересуюсь (изучаю новое)',
  },
]

// Второй шаг для "конкретной задачи" – показываем облако подсказок
const TASKS = [
  'Создать логотип',
  'Написать статью',
  'Сгенерировать код',
  'Оживить фото',
  'Сделать презентацию',
  'Обработать видео',
  'Перевести текст',
  'Создать музыку',
]

// Заглушки для быстрых ответов (в будущем можно подгружать из базы)
const ANSWERS = {
  newbie: {
    title: 'Добро пожаловать в мир AI!',
    text: 'AI может облегчить жизнь, автоматизировать рутину и вдохновить. Вот три простых шага, чтобы начать:',
    steps: [
      '1️⃣ Попробуйте ChatGPT — задайте любой вопрос, как человеку.',
      '2️⃣ Сгенерируйте свою первую картинку в Midjourney.',
      '3️⃣ Удивитесь, как быстро AI переводит тексты (DeepL).',
    ],
    serviceUrl: 'https://chat.openai.com', // можно заменить на реф. ссылку
    serviceLabel: 'Попробовать ChatGPT',
  },
  explorer: {
    title: 'AI для любознательных',
    text: 'Вам не нужно быть программистом. Вот несколько сервисов, которые порадуют:',
    items: [
      '🌄 Midjourney — рисует всё, что вы придумаете.',
      '📝 ChatGPT — сочинит стих, напишет письмо или объяснит сложное.',
      '🎵 Suno — создаст песню в любом жанре.',
    ],
    serviceUrl: 'https://midjourney.com',
    serviceLabel: 'Попробовать Midjourney',
  },
}

export default function Home() {
  const [step, setStep] = useState('question') // 'question' | 'newbie' | 'explorer' | 'tasks' | 'result'
  const [selectedTask, setSelectedTask] = useState('')
  const [customQuery, setCustomQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const handleFirstChoice = (choiceId) => {
    if (choiceId === 'specific') {
      setStep('tasks')
    } else {
      setStep(choiceId) // 'newbie' или 'explorer'
    }
  }

  const handleTaskClick = (task) => {
    setSelectedTask(task)
    setStep('result')
    // Здесь в будущем будем делать запрос к Supabase, чтобы найти сервис по use_cases
    // Пока показываем заглушку с универсальным ответом
  }

  const handleCustomSubmit = (e) => {
    e.preventDefault()
    if (!customQuery.trim()) return
    setSelectedTask(customQuery)
    setStep('result')
  }

  const reset = () => {
    setStep('question')
    setSelectedTask('')
    setCustomQuery('')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Шаг 1: вопрос */}
      {step === 'question' && (
        <div className="text-center animate-fadeIn">
          <h1 className="text-4xl font-light text-gray-800 mb-10">
            {FIRST_QUESTION}
          </h1>
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            {FIRST_CHOICES.map((choice) => (
              <button
                key={choice.id}
                onClick={() => handleFirstChoice(choice.id)}
                className="choice-btn"
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Шаг 2: Новичок (информация) */}
      {step === 'newbie' && (
        <div className="text-center animate-fadeIn">
          <h2 className="text-3xl font-light text-gray-800 mb-6">{ANSWERS.newbie.title}</h2>
          <p className="text-gray-700 mb-6">{ANSWERS.newbie.text}</p>
          <ul className="text-left max-w-md mx-auto text-gray-700 space-y-3 mb-8">
            {ANSWERS.newbie.steps.map((s, i) => (
              <li key={i} className="bg-white/40 rounded-xl p-3">{s}</li>
            ))}
          </ul>
          <a
            href={ANSWERS.newbie.serviceUrl}
            target="_blank"
            rel="noopener"
            className="btn-holographic px-8 py-3"
          >
            {ANSWERS.newbie.serviceLabel}
          </a>
          <div className="mt-6">
            <button onClick={reset} className="text-gray-500 hover:text-purple-500 transition">
              ← Задать другой вопрос
            </button>
          </div>
        </div>
      )}

      {/* Шаг 2: Исследователь */}
      {step === 'explorer' && (
        <div className="text-center animate-fadeIn">
          <h2 className="text-3xl font-light text-gray-800 mb-6">{ANSWERS.explorer.title}</h2>
          <p className="text-gray-700 mb-6">{ANSWERS.explorer.text}</p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {ANSWERS.explorer.items.map((item, i) => (
              <div key={i} className="cloud px-6 py-3 text-gray-700">{item}</div>
            ))}
          </div>
          <a
            href={ANSWERS.explorer.serviceUrl}
            target="_blank"
            rel="noopener"
            className="btn-holographic px-8 py-3"
          >
            {ANSWERS.explorer.serviceLabel}
          </a>
          <div className="mt-6">
            <button onClick={reset} className="text-gray-500 hover:text-purple-500 transition">
              ← Задать другой вопрос
            </button>
          </div>
        </div>
      )}

      {/* Шаг 2: Конкретная задача (облако + поиск) */}
      {step === 'tasks' && (
        <div className="text-center animate-fadeIn">
          <h2 className="text-3xl font-light text-gray-800 mb-8">
            Что именно нужно сделать?
          </h2>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {TASKS.map((task) => (
              <button
                key={task}
                onClick={() => handleTaskClick(task)}
                className="cloud px-5 py-2 font-medium text-gray-700 hover:scale-105 transition-transform"
              >
                {task}
              </button>
            ))}
          </div>
          <form onSubmit={handleCustomSubmit} className="max-w-md mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Или опишите задачу своими словами..."
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                className="flex-1 input-magic px-4 py-3"
              />
              <button type="submit" className="btn-holographic px-6 py-3">
                Подобрать
              </button>
            </div>
          </form>
          <div className="mt-6">
            <button onClick={reset} className="text-gray-500 hover:text-purple-500 transition">
              ← Назад
            </button>
          </div>
        </div>
      )}

      {/* Шаг 3: Результат (универсальная карточка) */}
      {step === 'result' && (
        <div className="text-center animate-fadeIn">
          <h2 className="text-2xl font-light text-gray-800 mb-4">
            Ваш запрос: «{selectedTask}»
          </h2>
          <div className="cloud p-8 max-w-md mx-auto text-left">
            <p className="text-gray-700 mb-4">
              Мы подберём лучший сервис для этой задачи. Скоро здесь появится персональная рекомендация с вашей партнёрской ссылкой.
            </p>
            <p className="text-gray-500 text-sm">
              А пока вы можете ознакомиться с <a href="/catalog" className="text-purple-500 underline">Реестром AI</a>.
            </p>
          </div>
          <div className="mt-6">
            <button onClick={reset} className="text-gray-500 hover:text-purple-500 transition">
              ← Задать другой вопрос
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
