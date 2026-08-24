import { useEffect } from 'react'
import { useRouter } from 'next/router'

// DEPRECATED: старый флоу приглашений по ?token= с temp_password в
// открытом виде убран по соображениям безопасности (см. миграцию
// supabase/migrations/20260802_security_and_platform.sql и
// pages/api/company-admin/invite-employee.js). Новые приглашения ведут на
// /invite-callback через настоящую ссылку Supabase Auth из письма.
//
// Этот файл оставлен только чтобы старые, уже разосланные ссылки вида
// /invite?token=... не падали с ошибкой 500, а вежливо объясняли, что
// нужно попросить новое приглашение.

export default function InviteDeprecated() {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => router.push('/login'), 4000)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="premium-card text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Ссылка устарела</h1>
        <p className="text-gray-400 mb-6">
          Формат приглашений изменился. Попросите администратора вашей компании отправить приглашение заново —
          новое письмо будет содержать актуальную защищённую ссылку.
        </p>
        <a href="/login" className="btn-gold inline-block">На страницу входа</a>
      </div>
    </div>
  )
}

InviteDeprecated.bypassLayout = true
