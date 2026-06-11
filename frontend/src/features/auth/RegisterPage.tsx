import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import AuthLayout from './AuthLayout'

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.'
  return null
}

export default function RegisterPage() {
  const { signUp, signInWithGoogle } = useAuth()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
    if (!fullName) {
      setError('Please enter your name.')
      return
    }
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
    const err = await signUp(email, password, fullName)
    setLoading(false)

    if (err) {
      if (err.code === 'rate_limited') {
        setError('Too many sign-up attempts. Please try again later.')
      } else if (err.code === 'network_error') {
        setError('Could not reach the server. Check your internet connection.')
      } else {
        setError('Something went wrong. Please try again.')
      }
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return <SignUpConfirmation email={email} />
  }

  return (
    <AuthLayout>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink mb-1">Sign Up</h1>
        <p className="text-sm text-ink">
          You can access the service as soon as you sign up.
        </p>
      </header>

      <section aria-labelledby="signup-with">
        <p id="signup-with" className="mb-3 text-sm font-semibold text-ink">
          Sign up with
        </p>
        <button
          type="button"
          onClick={() => { setGoogleLoading(true); signInWithGoogle() }}
          disabled={googleLoading}
          className="w-full rounded-md border border-ink bg-canvas px-6 py-2 text-sm font-semibold text-ink transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
          aria-label="Sign up with Google"
        >
          {googleLoading ? 'Redirecting…' : 'Google'}
        </button>
      </section>

      <hr className="my-6 border-ink" aria-hidden="true" />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <h2 className="text-base font-semibold text-ink">Create New Account</h2>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-ink bg-canvas px-4 py-3 text-sm text-ink"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="block text-sm text-ink mb-1">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input-outlined"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm text-ink mb-1">
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input-outlined"
            />
          </div>
        </div>

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

        <p className="text-xs text-ink text-center">
          By signing up, you agree to our{' '}
          <Link to="/terms-of-service" className="font-semibold underline underline-offset-4 hover:opacity-70">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy-policy" className="font-semibold underline underline-offset-4 hover:opacity-70">
            Privacy Policy
          </Link>
          .
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md border border-ink bg-purple px-6 py-2 text-sm font-semibold text-ink transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <div className="mt-8 rounded-md bg-[rgb(240,240,240)] px-4 py-4 text-center text-sm text-ink">
        Already have an account?{' '}
        <Link
          to="/auth/login"
          className="font-semibold underline underline-offset-4 hover:opacity-70"
        >
          Log in
        </Link>
      </div>
    </AuthLayout>
  )
}

function SignUpConfirmation({ email }: { email: string }) {
  return (
    <AuthLayout>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink mb-1">Sign Up</h1>
        <p className="text-sm text-ink">Email verification</p>
      </header>

      <p className="text-base font-semibold text-ink">Check your email</p>
      <p className="mt-3 text-sm leading-relaxed text-ink">
        If an account doesn't already exist for <span className="font-medium">{email}</span>,
        you'll receive a confirmation link shortly.
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
