import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useProfile } from '../context/ProfileContext'
import Spinner from './Spinner'

export function withAuth(Component, allowedRoles = []) {
  return function ProtectedRoute(props) {
    const { profile, loading } = useProfile()
    const router = useRouter()

    useEffect(() => {
      if (loading) return
      if (!profile) {
        router.push('/login')
      } else if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role_id)) {
        router.push('/')
      }
    }, [loading, profile, router])

    if (loading || !profile) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <Spinner />
        </div>
      )
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role_id)) {
      return null // редирект произойдёт в useEffect, пока ничего не рендерим
    }

    return <Component {...props} />
  }
}
