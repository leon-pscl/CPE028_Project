import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import AuthLayout from './AuthLayout'

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from ?? '/assess'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const err = await signIn(email, password)
    setLoading(false)

    if (err) {
      switch (err.code) {
        case 'rate_limited':
          setError('Too many login attempts. Please wait a few minutes and try again.')
          break
        case 'network_error':
          setError('Could not reach the server. Check your internet connection.')
          break
        default:
          setError('Invalid email or password.')
      }
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
    navigate(from, { replace: true })
  }

  return (
    <AuthLayout>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-ink mb-1">Welcome!</h1>
        <p className="text-sm text-ink">Please login to your account.</p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-md border border-ink bg-canvas px-4 py-3 text-sm text-ink"
          >
            {error}
          </div>
        )}

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

        <div>
          <label htmlFor="password" className="block text-sm text-ink mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-outlined"
          />
          <div className="mt-2 flex justify-end">
            <Link
              to="/auth/forgot-password"
              className="text-sm text-ink underline underline-offset-4 hover:opacity-70"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md border border-ink bg-purple px-6 py-2 text-sm font-semibold text-ink transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Signing in…' : 'Login'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="text-sm text-ink whitespace-nowrap">Or continue with</span>
        <span className="h-px flex-1 border-t border-ink" aria-hidden="true" />
      </div>

      <button
        type="button"
        onClick={() => { setGoogleLoading(true); signInWithGoogle() }}
        disabled={googleLoading}
        className="w-full rounded-md border border-ink bg-canvas px-6 py-2 text-sm font-semibold text-ink transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
        aria-label="Continue with Google"
      >
        {googleLoading ? 'Redirecting…' : 'Google'}
      </button>

      <div className="mt-8 rounded-md bg-[rgb(240,240,240)] px-4 py-4 text-center text-sm text-ink">
        No account yet?{' '}
        <Link
          to="/auth/register"
          className="font-semibold underline underline-offset-4 hover:opacity-70"
        >
          Sign up
        </Link>
      </div>
    </AuthLayout>
  )
}
