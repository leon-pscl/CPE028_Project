import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import AuthLayout from './AuthLayout'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from ?? '/assess'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
        <h1 className="font-display text-4xl font-extrabold tracking-display text-ink">
          Welcome!
        </h1>
        <p className="mt-1 text-base text-ink">Please login to your account.</p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-divider bg-canvas px-4 py-3 text-sm text-ink"
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
          <div className="mt-2 flex justify-end">
            <Link
              to="/auth/forgot-password"
              className="text-sm font-medium text-ink underline underline-offset-4 hover:opacity-70"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-purple disabled:opacity-50">
          {loading ? 'Signing in…' : 'Login'}
        </button>
      </form>

      <Divider label="Or continue with" />

      <button type="button" className="btn-placeholder" aria-label="Continue with Google">
        Google
      </button>

      <div className="mt-8 rounded-lg bg-placeholder px-4 py-3 text-center text-sm text-ink">
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

function Divider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-4">
      <span className="text-sm text-ink">{label}</span>
      <span className="h-px flex-1 bg-ink" aria-hidden="true" />
    </div>
  )
}