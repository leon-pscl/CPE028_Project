import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import AuthLayout from './AuthLayout'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    await resetPassword(email)
    setLoading(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <AuthLayout>
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-ink mb-1">Reset Password</h1>
          <p className="text-sm text-ink">Email sent</p>
        </header>

        <p className="text-base font-semibold text-ink">Check your email</p>
        <p className="mt-3 text-sm leading-relaxed text-ink">
          If <span className="font-medium">{email}</span> is associated with an account,
          you'll receive a password reset link shortly.
        </p>

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
        <p className="text-sm text-ink">
          Enter your email and we'll send you a reset link.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm text-ink mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-outlined"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md border border-ink bg-purple px-6 py-2 text-sm font-semibold text-ink transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <div className="mt-8 rounded-md bg-[rgb(240,240,240)] px-4 py-4 text-center text-sm text-ink">
        Remembered it?{' '}
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
