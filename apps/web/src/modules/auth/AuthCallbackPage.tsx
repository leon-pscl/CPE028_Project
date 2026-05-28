/**
 * modules/auth/AuthCallbackPage.tsx
 *
 * Landing page for PKCE/OAuth redirects (email confirmation, magic links).
 * Supabase exchanges the code for a session here, then we redirect the user
 * to their intended destination.
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase automatically picks up the code from the URL and exchanges it
    // detectSessionInUrl: true handles this in the client constructor.
    // We just need to wait for the session to be set, then redirect.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        navigate('/', { replace: true })
      } else if (event === 'PASSWORD_RECOVERY') {
        navigate('/auth/reset-password', { replace: true })
      }
    })

    // Fallback: if no event fires within 3 seconds, go home
    const timer = setTimeout(() => navigate('/', { replace: true }), 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-4" />
        <p className="text-sm text-gray-500">Completing sign in…</p>
      </div>
    </div>
  )
}
