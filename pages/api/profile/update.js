import { createClient } from '@supabase/supabase-js'
import { requireAuth, isCompanyAdmin, isSuperAdmin } from '../../../lib/auth'

// РАНЬШЕ: pages/profile.js обновлял profiles НАПРЯМУЮ с браузера
// (supabase.from('profiles').update(updates), клиент с anon key), передавая
// туда объект updates целиком. Сама форма отправляла только безобидные
// поля — но раз запрос идёт напрямую в PostgREST, единственное, что мешало
// добавить в updates произвольное поле (is_company_admin, role_id,
// can_delete_employees, company_id), — это RLS-политика на UPDATE для
// profiles, а типичная политика вида "auth.uid() = user_id" НЕ ограничивает,
// какие КОЛОНКИ можно менять, только какие строки видны. Теперь обновление
// идёт через этот серверный роут с явным allowlist полей — is_company_admin
// и другие «привилегированные» колонки сюда физически не долетают, что бы
// клиент ни прислал.
//
// ВАЖНО: это не отменяет необходимость проверить/ужесточить саму RLS-
// политику UPDATE на profiles — см. миграцию 002_profiles_rls_hardening.sql.
// Пока эта миграция не применена, прямой вызов PostgREST в обход этого
// роута (например, через консоль браузера с тем же JWT) всё ещё может
// сработать в зависимости от текущей политики.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAuth(req, res, {})
  if (!ctx) return

  const body = req.body || {}
  const updates = {
    first_name: typeof body.first_name === 'string' ? body.first_name.trim() : '',
    last_name: typeof body.last_name === 'string' ? body.last_name.trim() : '',
    phone: typeof body.phone === 'string' ? body.phone.trim() : '',
    hire_date: body.hire_date || null,
    department_id: body.department_id ? parseInt(body.department_id, 10) : null,
    avatar_url: typeof body.avatar_url === 'string' ? body.avatar_url : null,
  }
  updates.display_name = `${updates.first_name} ${updates.last_name}`.trim() || ctx.profile.email

  // position_id — как и в исходном UI ("Должность может изменить только
  // администратор"), но проверено сервером через is_company_admin, а не
  // через хардкод конкретного role_id (см. предупреждение в lib/auth.js о
  // том, что role_id уникален для каждой компании и хардкодить его небезопасно).
  // Для не-админа поле просто не трогаем, что бы ни пришло в запросе.
  if (isCompanyAdmin(ctx.profile) || isSuperAdmin(ctx.profile)) {
    updates.position_id = body.position_id ? parseInt(body.position_id, 10) : null
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await sb.from('profiles').update(updates).eq('user_id', ctx.user.id).select().single()
  if (error) return res.status(500).json({ error: 'Ошибка сохранения: ' + error.message })
  res.status(200).json({ profile: data })
}
