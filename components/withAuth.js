import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useProfile } from '../context/ProfileContext'
import Spinner from './Spinner'
import { isSuperAdmin, isCompanyAdmin, hasPermission, hasAnyAdminAccess } from '../lib/permissions'

export function withAuth(Component, options = {}) {
  const check = buildCheck(options)
  return function ProtectedRoute(props) {
    const { profile, loading } = useProfile()
    const router = useRouter()
    const allowed = !loading && profile && check(profile)
    useEffect(() => {
      if (loading) return
      if (!profile) { router.push('/login') } else if (!check(profile)) { router.push('/') }
    }, [loading, profile, router])
    if (loading || !profile) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'transparent' }}>
          <Spinner />
        </div>
      )
    }
    if (!allowed) return null
    return <Component {...props} />
  }
}

function buildCheck(options) {
  if (Array.isArray(options)) {
    const allowedRoles = options
    if (allowedRoles.length === 0) return () => true
    return (profile) => allowedRoles.includes(profile.role_id)
  }
  if (options.permission) return (profile) => hasPermission(profile, options.permission)
  if (options.adminOnly) return (profile) => isSuperAdmin(profile) || isCompanyAdmin(profile)
  if (options.anyStaff) return (profile) => hasAnyAdminAccess(profile)
  return () => true
}
