import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'
import { AuthContext, type AuthContextValue } from '../../hooks/useAuth'

const mockContext: AuthContextValue = {
  user: null,
  session: null,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  signInWithGoogle: vi.fn(),
  resetPassword: vi.fn(),
  updateProfile: vi.fn(),
}

function renderLoginPage(overrides: Partial<AuthContextValue> = {}) {
  const value = { ...mockContext, ...overrides }
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    renderLoginPage()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders Login button', () => {
    renderLoginPage()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  it('renders Google button', () => {
    renderLoginPage()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('renders sign up link', () => {
    renderLoginPage()
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
  })

  it('calls signIn with email and password on submit', async () => {
    const user = userEvent.setup()
    const signIn = vi.fn().mockResolvedValue(null)
    renderLoginPage({ signIn })

    await user.type(screen.getByLabelText(/email/i), 'test@test.com')
    await user.type(screen.getByLabelText(/password/i), 'Password1')
    await user.click(screen.getByRole('button', { name: /login/i }))

    expect(signIn).toHaveBeenCalledWith('test@test.com', 'Password1')
  })

  it('displays error when signIn returns error', async () => {
    const user = userEvent.setup()
    const signIn = vi.fn().mockResolvedValue({ code: 'invalid_credentials' })
    renderLoginPage({ signIn })

    await user.type(screen.getByLabelText(/email/i), 'bad@test.com')
    await user.type(screen.getByLabelText(/password/i), 'WrongPass1')
    await user.click(screen.getByRole('button', { name: /login/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i)
  })

  it('calls signInWithGoogle when Google button clicked', async () => {
    const user = userEvent.setup()
    const signInWithGoogle = vi.fn().mockResolvedValue(undefined)
    renderLoginPage({ signInWithGoogle })

    await user.click(screen.getByRole('button', { name: /continue with google/i }))
    expect(signInWithGoogle).toHaveBeenCalled()
  })
})
