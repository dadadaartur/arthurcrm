// Клиентский аналог логики из lib/auth.js — та же модель прав,
// но без обращения к service-role ключу (безопасно для браузера).
// Используется в components/withAuth.js и на страницах company-admin/*.

export const ROLES = {
  SUPER_ADMIN: 1,
}

/** Супер-админ Кармического банка — доступ везде, во всех компаниях.
 *  Проверяем и role_id, и company_id === null — см. lib/auth.js. */
export function isSuperAdmin(profile) {
  return profile?.role_id === ROLES.SUPER_ADMIN && profile?.company_id == null
}

/** Полноправный админ конкретной компании. */
export function isCompanyAdmin(profile) {
  return profile?.is_company_admin === true
}

/**
 * Есть ли у профиля право `permissionFlag` (например 'can_review_tasks').
 * Супер-админ и админ компании имеют его автоматически.
 */
export function hasPermission(profile, permissionFlag) {
  if (!profile) return false
  if (isSuperAdmin(profile)) return true
  if (isCompanyAdmin(profile)) return true
  return profile[permissionFlag] === true
}

/** Есть ли у профиля хоть какое-то административное/модераторское право
 *  (используется для "общих" разделов вроде дашборда company-admin). */
export function hasAnyAdminAccess(profile) {
  if (!profile) return false
  if (isSuperAdmin(profile)) return true
  if (isCompanyAdmin(profile)) return true
  return (
    profile.can_create_tasks === true ||
    profile.can_review_tasks === true ||
    profile.can_manage_employees === true ||
    profile.can_delete_employees === true
  )
}

/** Человекочитаемая метка роли для UI. */
export function roleLabel(profile) {
  if (isSuperAdmin(profile)) return 'Супер-админ'
  if (isCompanyAdmin(profile)) return 'Админ компании'
  if (hasAnyAdminAccess(profile)) return 'Модератор'
  return 'Сотрудник'
}
