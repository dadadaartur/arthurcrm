import { getPlatformStaffContext } from '../../../lib/auth'

export default async function handler(req, res) {
  const ctx = await getPlatformStaffContext(req)
  if (ctx.error) {
    // Не палим лишнего кодом ошибки платформенного доступа обычным
    // пользователям компаний — просто "не стафф".
    return res.status(200).json({ isPlatformStaff: false })
  }
  res.status(200).json({
    isPlatformStaff: true,
    isSuperAdmin: ctx.isSuperAdmin,
    permissions: ctx.permissions
  })
}
