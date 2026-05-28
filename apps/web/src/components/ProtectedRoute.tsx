/**
 * components/ProtectedRoute.tsx
 *
 * Wraps routes that require authentication.
 * Unauthenticated users are redirected to /auth/login with the
 * original destination preserved in state so they can be sent back
 * after a successful login.
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { ReactNode } from 'react'
import type { UserRole } from '../hooks/useAuth'

interface Props {
  children: ReactNode
  /** If provided, only users with this role (or admin) can access */
  requiredRole?: UserRole
}

export function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Show nothing while the session is being hydrated
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/auth/login"
        state={{ from: location.pathname }}
        replace
      />
    )
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
