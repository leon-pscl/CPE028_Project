import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, type UserRole } from '../../hooks/useAuth'
import AuthLayout from './AuthLayout'

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'consumer', label: 'Consumer', description: 'I want to assess my device' },
  { value: 'technician', label: 'Technician', description: 'I repair or recycle devices' },
]

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.'
  return null
}

export default function RegisterPage() {
  const { signUp } = useAuth()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<UserRole>('consumer')
  const [showPasswordHint, setShowPasswordHint] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

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
    const err = await signUp(email, password, fullName, role)
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
        <h1 className="font-display text-4xl font-extrabold tracking-display text-ink">
          Sign Up
        </h1>
        <p className="mt-1 text-base text-ink">
          You can access the service as soon as you sign up.
        </p>
      </header>

      <section aria-labelledby="signup-with">
        <p id="signup-with" className="mb-3 text-sm font-semibold text-ink">
          Sign up with
        </p>
        <button type="button" className="btn-placeholder" aria-label="Sign up with Google">
          Google
        </button>
      </section>

      <hr className="my-6 border-ink" aria-hidden="true" />

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <h2 className="text-base font-semibold text-ink">Create New Account</h2>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-divider bg-canvas px-4 py-3 text-sm text-ink"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="label">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="label">
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

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
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            aria-describedby={showPasswordHint ? 'password-requirements' : undefined}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            Re-enter password to confirm
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setShowPasswordHint((v) => !v)}
              className="text-sm font-medium text-ink underline underline-offset-4 hover:opacity-70 cursor-pointer"
              aria-expanded={showPasswordHint}
              aria-controls="password-requirements"
            >
              Password Requirements
            </button>
          </div>
          {showPasswordHint && (
            <p id="password-requirements" className="mt-2 text-xs text-muted">
              At least 8 characters, with 1 uppercase letter and 1 number.
            </p>
          )}
        </div>

        <fieldset>
          <legend className="label">I am a…</legend>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((r) => {
              const selected = role === r.value
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`rounded-lg px-3 py-3 text-left transition-colors cursor-pointer
                    ${selected
                      ? 'bg-ink text-accent-fg'
                      : 'bg-placeholder text-ink hover:brightness-95'
                    }`}
                  aria-pressed={selected}
                >
                  <p className="text-sm font-semibold">{r.label}</p>
                  <p className={`mt-0.5 text-xs ${selected ? 'opacity-80' : 'text-muted'}`}>
                    {r.description}
                  </p>
                </button>
              )
            })}
          </div>
        </fieldset>

        <button type="submit" disabled={loading} className="btn-placeholder disabled:opacity-50">
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <div className="mt-8 rounded-lg bg-placeholder px-4 py-3 text-center text-sm text-ink">
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
        <h1 className="font-display text-4xl font-extrabold tracking-display text-ink">
          Sign Up
        </h1>
        <p className="mt-1 text-base text-ink">Email verification</p>
      </header>

      <p className="text-base font-semibold text-ink">Check your email</p>
      <p className="mt-3 text-sm leading-relaxed text-ink">
        If an account doesn’t already exist for <span className="font-medium">{email}</span>,
        you’ll receive a confirmation link shortly.
      </p>

      <hr className="my-6 border-ink" aria-hidden="true" />

      <Link to="/auth/login" className="btn-placeholder">
        Back to Login
      </Link>
    </AuthLayout>
  )
}
