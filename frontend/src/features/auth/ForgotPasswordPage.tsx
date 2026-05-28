import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              If <strong>{email}</strong> is associated with an account, you'll receive
              a password reset link shortly.
            </p>
            <Link
              to="/auth/login"
              className="mt-6 inline-block text-sm text-green-600 font-medium hover:text-green-700"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Reset your password</h1>
          <p className="mt-2 text-gray-500 text-sm">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white
                         hover:bg-green-700 disabled:opacity-50 transition
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Remembered it?{' '}
            <Link to="/auth/login" className="text-green-600 font-medium hover:text-green-700">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
