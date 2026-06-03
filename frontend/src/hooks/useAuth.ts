import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type UserRole = 'consumer' | 'technician' | 'admin'

export interface AuthUser {
  id: string
  email: string
  fullName: string | null
  role: UserRole
  avatarUrl: string | null
  emailConfirmed: boolean
}

export type AuthError =
  | { code: 'invalid_credentials' }
  | { code: 'email_not_confirmed' }
  | { code: 'rate_limited' }
  | { code: 'network_error' }
  | { code: 'unknown'; message: string }

export interface AuthContextValue {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthError | null>
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<AuthError | null>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (updates: Partial<Pick<AuthUser, 'fullName' | 'avatarUrl'>>) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
