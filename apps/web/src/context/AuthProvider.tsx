/**
 * context/AuthProvider.tsx
 *
 * Uses Supabase auth metadata directly instead of querying public.users.
 * This avoids the 400 error from the users table while keeping full
 * auth functionality. Profile data (name, role) comes from user_metadata
 * which is set during signUp().
 */

import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  AuthContext,
  type AuthUser,
  type AuthError,
  type AuthContextValue,
  type UserRole,
} from '../hooks/useAuth'
import type { User, Session } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapSupabaseError(error: { message: string; status?: number }): AuthError {
  const msg = error.message.toLowerCase()
  if (msg.includes('rate limit') || error.status === 429) return { code: 'rate_limited' }
  if (
    msg.includes('invalid login') ||
    msg.includes('invalid credentials') ||
    msg.includes('wrong password') ||
    msg.includes('user not found') ||
    msg.includes('email not confirmed')
  ) {
    return { code: 'invalid_credentials' }
  }
  if (msg.includes('network') || msg.includes('fetch')) return { code: 'network_error' }
  return { code: 'unknown', message: error.message }
}

/**
 * Build AuthUser purely from Supabase auth metadata.
 * No DB query — no 400 errors, no RLS issues.
 */
function buildUser(rawUser: User): AuthUser {
  const meta = rawUser.user_metadata ?? {}
  return {
    id: rawUser.id,
    email: rawUser.email ?? '',
    fullName: (meta.full_name as string) ?? (meta.name as string) ?? null,
    role: (meta.role as UserRole) ?? 'consumer',
    avatarUrl: (meta.avatar_url as string) ?? null,
    emailConfirmed: !!rawUser.email_confirmed_at,
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  useEffect(() => {
    // Hydrate immediately from localStorage on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session)
        setUser(buildUser(session.user))
      }
      setLoading(false)
      initialized.current = true
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!initialized.current && event === 'INITIAL_SESSION') return

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setSession(null)
          setLoading(false)
          return
        }

        if (session?.user) {
          setSession(session)
          setUser(buildUser(session.user))
        } else {
          setUser(null)
          setSession(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // -------------------------------------------------------------------------
  // signIn
  // -------------------------------------------------------------------------
  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthError | null> => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) return mapSupabaseError(error)

      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut()
        return { code: 'invalid_credentials' }
      }

      // Set user eagerly so UI updates before navigate() fires
      if (data.user) {
        setSession(data.session)
        setUser(buildUser(data.user))
      }

      return null
    },
    []
  )

  // -------------------------------------------------------------------------
  // signUp
  // -------------------------------------------------------------------------
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      role: UserRole
    ): Promise<AuthError | null> => {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          // Store name and role in auth metadata — no DB write needed
          data: { full_name: fullName.trim(), role },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('user already exists')) {
          return null // Anti-enumeration
        }
        return mapSupabaseError(error)
      }

      return null
    },
    []
  )

  // -------------------------------------------------------------------------
  // signOut
  // -------------------------------------------------------------------------
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }, [])

  // -------------------------------------------------------------------------
  // resetPassword
  // -------------------------------------------------------------------------
  const resetPassword = useCallback(async (email: string) => {
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
  }, [])

  // -------------------------------------------------------------------------
  // updateProfile — updates auth metadata since we're not using public.users
  // -------------------------------------------------------------------------
  const updateProfile = useCallback(
    async (updates: Partial<Pick<AuthUser, 'fullName' | 'avatarUrl'>>) => {
      if (!user) return

      const metaUpdates: Record<string, unknown> = {}
      if (updates.fullName !== undefined) metaUpdates.full_name = updates.fullName
      if (updates.avatarUrl !== undefined) metaUpdates.avatar_url = updates.avatarUrl

      const { data, error } = await supabase.auth.updateUser({
        data: metaUpdates,
      })

      if (!error && data.user) {
        setUser(buildUser(data.user))
      }
    },
    [user]
  )

  const value: AuthContextValue = {
    user, session, loading,
    signIn, signUp, signOut, resetPassword, updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
