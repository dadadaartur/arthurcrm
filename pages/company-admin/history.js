import { useEffect } from 'react'
import { useRouter } from 'next/router'
import LoadingScreen from '../../components/LoadingScreen'

// Отдельная кнопка «История заданий» убрана из панели администратора —
// не работала и дублировала то, что уже есть в «Управлении заданиями»
// (вкладки «Активные»/«Архив», плюс история решений внутри вкладки
// «На проверке»). Оставлено редиректом на случай старых ссылок/закладок.
export default function HistoryRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/company-admin/tasks?tab=active') }, [router])
  return <LoadingScreen />
}
