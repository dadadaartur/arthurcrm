import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function Welcome() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [goal, setGoal] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        // Проверяем, не привязан ли уже к компании
        supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.company_id) router.push('/')
          })
      }
    })
  }, [router])

  async function handleGoalSubmit(e) {
    e.preventDefault()
    if (!goal.trim()) return

    // Сохраняем цель в профиле (можно добавить поле goal в таблицу profiles)
    // Пока просто покажем сообщение и ссылку на HRDNK
    setGoal('')
    alert('Спасибо! Ваша цель отмечена. Перейдите на HRDNK.ru для развития вне компании.')
  }

  if (!user) return <div className="p-8 text-center text-gray-400">Загрузка...</div>

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 text-center">
      <div className="premium-card">
        <h1 className="text-3xl font-bold text-deep-blue mb-4">Добро пожаловать в экосистему</h1>
        <p className="text-gray-400 mb-6">
          Ваш аккаунт ещё не привязан к компании. Пожалуйста, отметьте цель регистрации, и мы поможем вам развиваться уже сейчас.
        </p>

        <form onSubmit={handleGoalSubmit} className="mb-6">
          <select value={goal} onChange={e => setGoal(e.target.value)} className="input-field mb-3" required>
            <option value="">Выберите цель</option>
            <option value="Хочу прокачать рейтинг без компании">Хочу прокачать рейтинг без компании</option>
            <option value="Ищу работу">Ищу работу</option>
            <option value="Хочу учиться">Хочу учиться</option>
            <option value="Другое">Другое</option>
          </select>
          <button type="submit" className="btn-gold w-full">Отправить</button>
        </form>

        <div className="border-t border-gray-700 pt-6">
          <p className="text-gray-300 mb-4">
            Вы можете пройти обучение, тесты и квизы на портале HRDNK, чтобы повысить свой профессиональный рейтинг.
          </p>
          <a
            href="https://hrdnk.ru"
            target="_blank"
            rel="noopener"
            className="btn-gold inline-block"
          >
            Перейти на HRDNK.ru
          </a>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Если вы уже являетесь сотрудником компании, обратитесь к администратору за приглашением.
        </p>
      </div>
    </div>
  )
}
