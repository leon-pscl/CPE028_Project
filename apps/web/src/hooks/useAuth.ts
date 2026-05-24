import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { User, Session, AuthError } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

interface SignInResult {
  data: { user: User | null; session: Session | null } | null
  error: AuthError | null
}

interface SignUpResult {
  data: { user: User | null; session: Session | null } | null
  error: AuthError | null
}

interface SignOutResult {
  error: AuthError | null
}

interface ResetPasswordResult {
  data: {} | null
  error: AuthError | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        session,
        user: session?.user ?? null,
        loading: false,
      })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState({
          session,
          user: session?.user ?? null,
          loading: false,
        })
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signUp = async (email: string, password: string, options: Record<string, any> = {}): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options,
    })
    return { data, error }
  }

  const signOut = async (): Promise<SignOutResult> => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const resetPassword = async (email: string): Promise<ResetPasswordResult> => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    return { data, error }
  }

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }
}