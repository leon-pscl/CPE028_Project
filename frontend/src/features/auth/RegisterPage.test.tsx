import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RegisterPage from './RegisterPage'
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

function renderRegisterPage(overrides: Partial<AuthContextValue> = {}) {
  const value = { ...mockContext, ...overrides }
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RegisterPage', () => {
  it('renders first name, last name, email, password, confirm password fields', () => {
    renderRegisterPage()
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/re-enter password/i)).toBeInTheDocument()
  })

  it('renders Create Account button', () => {
    renderRegisterPage()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders Google sign-up button', () => {
    renderRegisterPage()
    expect(screen.getByRole('button', { name: /sign up with google/i })).toBeInTheDocument()
  })

  it('shows error for missing name', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await user.type(screen.getByLabelText(/email/i), 'test@test.com')
    await user.type(screen.getByLabelText(/password$/i), 'Password1')
    await user.type(screen.getByLabelText(/re-enter password/i), 'Password1')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/enter your name/i)
  })

  it('shows error for short password', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email/i), 'test@test.com')
    await user.type(screen.getByLabelText(/password$/i), 'short')
    await user.type(screen.getByLabelText(/re-enter password/i), 'short')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 8 characters/i)
  })

  it('shows error for mismatched passwords', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email/i), 'test@test.com')
    await user.type(screen.getByLabelText(/password$/i), 'Password1')
    await user.type(screen.getByLabelText(/re-enter password/i), 'Different1')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/passwords do not match/i)
  })

  it('calls signUp with valid inputs', async () => {
    const user = userEvent.setup()
    const signUp = vi.fn().mockResolvedValue(null)
    renderRegisterPage({ signUp })

    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@test.com')
    await user.type(screen.getByLabelText(/password$/i), 'Password1')
    await user.type(screen.getByLabelText(/re-enter password/i), 'Password1')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(signUp).toHaveBeenCalledWith('john@test.com', 'Password1', 'John Doe')
  })

  it('calls signInWithGoogle when Google button clicked', async () => {
    const user = userEvent.setup()
    const signInWithGoogle = vi.fn().mockResolvedValue(undefined)
    renderRegisterPage({ signInWithGoogle })

    await user.click(screen.getByRole('button', { name: /sign up with google/i }))
    expect(signInWithGoogle).toHaveBeenCalled()
  })
})
