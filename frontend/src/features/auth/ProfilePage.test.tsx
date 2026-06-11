import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProfilePage from './ProfilePage'
import { AuthContext, type AuthContextValue, type AuthUser } from '../../hooks/useAuth'
import { db } from '../../lib/database'

vi.mock('../../lib/database', () => ({
  db: {
    userTransactions: {
      getByUserId: vi.fn(),
    },
  },
}))

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'test@test.com',
  fullName: 'Test User',
  role: 'consumer',
  avatarUrl: null,
  emailConfirmed: true,
}

const mockContext: AuthContextValue = {
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

function renderProfile(overrides: Partial<AuthContextValue> = {}) {
  const value = { ...mockContext, ...overrides }
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(db.userTransactions.getByUserId).mockResolvedValue({ data: [], error: null })
})

describe('ProfilePage', () => {
  it('renders user name and email', () => {
    renderProfile()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@test.com')).toBeInTheDocument()
  })

  it('renders role label', () => {
    renderProfile()
    expect(screen.getByText('Consumer')).toBeInTheDocument()
  })

  it('renders email verified status', () => {
    renderProfile()
    expect(screen.getByText('Yes')).toBeInTheDocument()
  })

  it('renders sign out button', () => {
    renderProfile()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('renders edit profile button', () => {
    renderProfile()
    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument()
  })

  it('shows Assessment History heading', () => {
    renderProfile()
    expect(screen.getByText('Assessment History')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    vi.mocked(db.userTransactions.getByUserId).mockReturnValue(new Promise(() => {}))
    renderProfile()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows empty state when no assessments', async () => {
    renderProfile()
    expect(await screen.findByText('No assessments yet.')).toBeInTheDocument()
  })

  it('renders assessment history items', async () => {
    vi.mocked(db.userTransactions.getByUserId).mockResolvedValue({
      data: [
        { id: 'tx-1', created_at: '2026-01-15T10:00:00Z', payload: { direction: 'REPAIR', score: 75 } },
        { id: 'tx-2', created_at: '2026-02-20T14:30:00Z', payload: { direction: 'RECYCLE', score: 20 } },
      ],
      error: null,
    })

    renderProfile()
    expect(await screen.findByText(/REPAIR.*Score 75\/100/i)).toBeInTheDocument()
    expect(screen.getByText(/RECYCLE.*Score 20\/100/i)).toBeInTheDocument()
  })

  it('calls signOut when Sign out button clicked', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined)
    renderProfile({ signOut })

    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /sign out/i }))

    expect(signOut).toHaveBeenCalled()
  })
})
