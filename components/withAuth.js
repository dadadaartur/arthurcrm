import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useProfile } from '../context/ProfileContext'
import Spinner from './Spinner'
import { isSuperAdmin, isCompanyAdmin, hasPermission, hasAnyAdminAccess } from '../lib/permissions'

/**
 * withAuth(Component, options)
 *
 * options:
 *  - { permission: 'can_review_tasks' } — требует конкретное право
 *  - { adminOnly: true } — только супер-админ или админ компании
 *  - { anyStaff: true } — любой с хоть одним административным правом
 *
 * Легаси: массив вида [1, 2] по-прежнему поддерживается, но не
 * рекомендуется — role_id уникальны для каждой компании.
 */
export function withAuth(Component, options = {}) {
  const check = buildCheck(options)

  return function ProtectedRoute(props) {
    const { profile, loading } = useProfile()
    const router = useRouter()

    const allowed = !loading && profile && check(profile)

    useEffect(() => {
      if (loading) return
      if (!profile) {
        router.push('/login')
      } else if (!check(profile)) {
        router.push('/')
      }
    }, [loading, profile, router])

    if (loading || !profile) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a1628' }}>
          <Spinner />
        </div>
      )
    }

    if (!allowed) {
      return null
    }

    return <Component {...props} />
  }
}

function buildCheck(options) {
  if (Array.isArray(options)) {
    const allowedRoles = options
    if (allowedRoles.length === 0) return () => true
    return (profile) => allowedRoles.includes(profile.role_id)
  }

  if (options.permission) {
    return (profile) => hasPermission(profile, options.permission)
  }
  if (options.adminOnly) {
    return (profile) => isSuperAdmin(profile) || isCompanyAdmin(profile)
  }
  if (options.anyStaff) {
    return (profile) => hasAnyAdminAccess(profile)
  }
  return () => true
}
