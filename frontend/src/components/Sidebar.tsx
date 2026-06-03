import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  CircleUserRound,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useScrollSpy } from '../hooks/useScrollSpy'
import { primaryNav, homeSectionIds, type NavItem } from './nav'

export default function Sidebar() {
  const [hovered, setHovered] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading: authLoading, signOut } = useAuth()

  // Authenticated users see Assessment, Roadmap, Connect (no Home).
  // Unauthenticated visitors see all four.
  const navItems = user
    ? primaryNav.filter((item) => item.to !== '/')
    : primaryNav

  const onHome = location.pathname === '/'
  const activeSection = useScrollSpy(homeSectionIds, { enabled: onHome && !user })

  // Expanded when hovered (desktop) or when the mobile drawer is open.
  const expanded = hovered || mobileOpen

  // Auto-close the mobile drawer on route change.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  async function handleLogout() {
    setMobileOpen(false)
    await signOut()
    navigate('/')
  }

  function isActive(item: NavItem) {
    if (onHome) {
      return activeSection
        ? item.homeSectionId === activeSection
        : item.to === '/'
    }
    if (item.to === '/') return false
    return location.pathname.startsWith(item.to)
  }

  function handleNavClick(item: NavItem, e: React.MouseEvent<HTMLAnchorElement>) {
    setMobileOpen(false)
    // On the home page, scroll to the section instead of routing.
    if (onHome && item.homeSectionId) {
      const el = document.getElementById(item.homeSectionId)
      if (el) {
        e.preventDefault()
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  return (
    <>
      {/* Mobile open button — hidden once the drawer is open (the X inside
          the sidebar takes over) and on desktop (hover handles it). */}
      {!mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-md border border-ink bg-canvas text-ink md:hidden cursor-pointer"
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      )}

      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink/30 md:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden
          border-r border-ink bg-canvas
          transition-[width,transform] duration-200 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{
          width: expanded ? 'var(--sidebar-width-open)' : 'var(--sidebar-width)',
        }}
        aria-label="Primary"
      >
        {/* Header / logo block (white square when collapsed, text when expanded) */}
        <div className="relative h-16 shrink-0">
          {/* When collapsed, just show white square */}
          {!expanded && (
            <div className="absolute inset-y-0 left-0 w-[var(--sidebar-width)] bg-canvas" aria-hidden="true" />
          )}
          
          {/* When expanded, show logo text */}
          {expanded && (
            <>
              <div
                className="absolute inset-y-0 left-0 w-[var(--sidebar-width)] bg-ink"
                aria-hidden="true"
              />
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className={`
                  absolute inset-y-0 left-[var(--sidebar-width)] right-12 flex items-center pl-4
                  font-display text-lg font-bold tracking-display text-ink
                  transition-opacity duration-150 cursor-pointer
                  ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `}
              >
                Rev.Tech
              </Link>
              {/* Mobile close — only when drawer is open */}
              {mobileOpen && (
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-canvas md:hidden cursor-pointer"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <SidebarLink
                  item={item}
                  active={isActive(item)}
                  expanded={expanded}
                  onClick={(e) => handleNavClick(item, e)}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom: account */}
        <div className="border-t border-ink py-3">
          {!authLoading && (
            <ul className="flex flex-col gap-1">
              {user ? (
                <>
                  <li>
                    <SidebarLink
                      item={{ to: '/auth/profile', label: 'Account', icon: CircleUserRound }}
                      active={location.pathname.startsWith('/auth/profile')}
                      expanded={expanded}
                      onClick={() => setMobileOpen(false)}
                    />
                  </li>
                  <li>
                    <SidebarButton
                      label="Log out"
                      icon={LogOut}
                      expanded={expanded}
                      onClick={handleLogout}
                    />
                  </li>
                </>
              ) : (
                <li>
                  <SidebarLink
                    item={{ to: '/auth/login', label: 'Account / Log in', icon: CircleUserRound }}
                    active={
                      location.pathname.startsWith('/auth/login') ||
                      location.pathname.startsWith('/auth/register')
                    }
                    expanded={expanded}
                    onClick={() => setMobileOpen(false)}
                  />
                </li>
              )}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}

function SidebarLink({
  item,
  active,
  expanded,
  onClick,
}: {
  item: NavItem
  active: boolean
  expanded: boolean
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void
}) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`
        relative flex h-12 items-center text-sm font-medium tracking-wide
        transition-colors cursor-pointer
        ${active ? 'bg-canvas text-ink' : 'text-ink hover:bg-canvas'}
      `}
    >
      {active && (
        <span className="absolute inset-y-0 left-0 w-1 bg-ink" aria-hidden="true" />
      )}
      <span className="flex h-12 w-[var(--sidebar-width)] shrink-0 items-center justify-center">
        <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span
        className={`
          whitespace-nowrap uppercase tracking-[0.08em]
          transition-opacity duration-150
          ${expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        {item.label}
      </span>
    </Link>
  )
}

function SidebarButton({
  label,
  icon: Icon,
  expanded,
  onClick,
}: {
  label: string
  icon: LucideIcon
  expanded: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative flex h-12 w-full items-center text-sm font-medium tracking-wide text-ink hover:bg-canvas transition-colors cursor-pointer"
    >
      <span className="flex h-12 w-[var(--sidebar-width)] shrink-0 items-center justify-center">
        <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span
        className={`
          whitespace-nowrap uppercase tracking-[0.08em]
          transition-opacity duration-150
          ${expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        {label}
      </span>
    </button>
  )
}