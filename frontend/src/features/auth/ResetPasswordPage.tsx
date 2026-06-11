import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from './AuthLayout'

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.'
  return null
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const pwError = validatePassword(password)
    if (pwError) {
      setError(pwError)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const { supabase } = await import('../../lib/supabaseClient')
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message || 'Failed to update password. Please try again.')
      } else {
        setSubmitted(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  if (submitted) {
    return (
      <AuthLayout>
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-ink mb-1">Password Updated</h1>
          <p className="text-sm text-ink">Your password has been changed successfully.</p>
        </header>

        <hr className="my-6 border-ink" aria-hidden="true" />

        <Link
          to="/auth/login"
          className="w-full rounded-md border border-ink bg-canvas px-6 py-2 text-sm font-semibold text-ink text-center transition-colors hover:opacity-90 block"
        >
          Back to Login
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-ink mb-1">Reset Password</h1>
        <p className="text-sm text-ink">Enter your new password below.</p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-md border border-ink bg-canvas px-4 py-3 text-sm text-ink"
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm text-ink mb-1">
            New Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-outlined"
          />
          <p className="mt-2 text-xs text-ink">
            At least 8 characters, with 1 uppercase letter and 1 number.
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm text-ink mb-1">
            Re-enter password to confirm
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-outlined"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md border border-ink bg-purple px-6 py-2 text-sm font-semibold text-ink transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>

      <div className="mt-8 rounded-md bg-[rgb(240,240,240)] px-4 py-4 text-center text-sm text-ink">
        <Link
          to="/auth/login"
          className="font-semibold underline underline-offset-4 hover:opacity-70"
        >
          Back to Login
        </Link>
      </div>
    </AuthLayout>
  )
}
