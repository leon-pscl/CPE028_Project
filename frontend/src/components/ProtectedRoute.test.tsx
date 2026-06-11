import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AuthContext, type AuthContextValue, type AuthUser, type UserRole } from '../hooks/useAuth'

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'test@test.com',
  fullName: 'Test User',
  role: 'consumer',
  avatarUrl: null,
  emailConfirmed: true,
}

function makeUser(role: UserRole): AuthUser {
  return { ...mockUser, role }
}

const baseContext: AuthContextValue = {
  user: mockUser,
  session: null,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  signInWithGoogle: vi.fn(),
  resetPassword: vi.fn(),
  updateProfile: vi.fn(),
}

function renderProtected(
  overrides: Partial<AuthContextValue> = {},
  props: { requiredRole?: UserRole } = {}
) {
  const value = { ...baseContext, ...overrides }
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <ProtectedRoute {...props}>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProtectedRoute', () => {
  it('shows children when user is authenticated', () => {
    renderProtected()
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to login when user is null', () => {
    renderProtected({ user: null })
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('shows loading spinner when loading is true', () => {
    renderProtected({ loading: true })
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders when requiredRole matches user role', () => {
    renderProtected({ user: makeUser('moderator') }, { requiredRole: 'moderator' })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('allows admin to access any requiredRole', () => {
    renderProtected({ user: makeUser('admin') }, { requiredRole: 'moderator' })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects when requiredRole does not match', () => {
    renderProtected({ user: makeUser('consumer') }, { requiredRole: 'admin' })
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})
