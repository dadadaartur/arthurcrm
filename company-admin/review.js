import { useEffect } from 'react'
import { useRouter } from 'next/router'
import LoadingScreen from '../../components/LoadingScreen'

// Проверка заданий консолидирована в company-admin/tasks.js (вкладка
// «На проверке») — раньше это была отдельная страница с независимой
// реализацией той же логики, что затрудняло управление (два места вместо
// одного) и приводило к рассинхронизации (например, зона ответственности
// руководителя отдела учитывалась в tasks.js, но не в этом файле).
// Оставлен редиректом, чтобы старые ссылки/закладки не вели в тупик.
export default function ReviewRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/company-admin/tasks?tab=review') }, [router])
  return <LoadingScreen />
}
