import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Recycle, MapPin, ClipboardCheck, Home as HomeIcon, User, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

interface NavLink {
  to: string
  label: string
  icon: typeof HomeIcon
  onClick?: (e: React.MouseEvent) => void
}

const navLinks: NavLink[] = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/assess', label: 'Assess', icon: ClipboardCheck },
  { to: '/navigate', label: 'Navigate', icon: Recycle },
  { to: '/connect', label: 'Connect', icon: MapPin },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault()
    window.location.href = '/'
  }

  const authLinks: NavLink[] = [
    { to: '/auth/profile', label: 'Profile', icon: User },
    { to: '/', label: 'Logout', icon: LogOut, onClick: handleLogout },
  ]

  const guestLinks: NavLink[] = [
    { to: '/auth/login', label: 'Login', icon: User },
    { to: '/auth/register', label: 'Register', icon: User },
  ]

  const closeMobile = () => setMobileOpen(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
              <Recycle className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">ReDevice</span>
          </Link>

          <div className="hidden md:flex md:items-center md:gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              )
            })}

            {authLoading ? null : user ? (
              authLinks.map(({ to, label, icon: Icon, onClick }) =>
                onClick ? (
                  <button
                    key={to}
                    onClick={onClick}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer hover:bg-gray-100"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ) : (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer hover:bg-gray-100"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                )
              )
            ) : (
              guestLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer hover:bg-gray-100"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="space-y-1 px-4 py-3">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={closeMobile}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              )
            })}

            {authLoading ? null : user ? (
              authLinks.map(({ to, label, icon: Icon, onClick }) =>
                onClick ? (
                  <button
                    key={to}
                    onClick={(e) => { onClick(e); closeMobile() }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer hover:bg-gray-100"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ) : (
                  <Link
                    key={to}
                    to={to}
                    onClick={closeMobile}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer hover:bg-gray-100"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                )
              )
            ) : (
              guestLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={closeMobile}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer hover:bg-gray-100"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </nav>
  )
}