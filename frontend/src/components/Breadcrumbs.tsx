import { Link, useLocation } from 'react-router-dom'

const LABELS: Record<string, string> = {
  '': 'Home',
  assess: 'Assess',
  navigate: 'Navigate',
  connect: 'Connect',
  login: 'Login',
  register: 'Register',
  'forgot-password': 'Forgot Password',
  profile: 'Profile',
}

export default function Breadcrumbs() {
  const { pathname } = useLocation()
  if (pathname === '/') return null

  const segments = pathname.split('/').filter(Boolean)

  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
      <ol className="flex items-center gap-1.5">
        <li>
          <Link to="/" className="hover:text-brand-600 transition-colors">Home</Link>
        </li>
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1
          const href = '/' + segments.slice(0, i + 1).join('/')
          const label = LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1)
          return (
            <li key={href} className="flex items-center gap-1.5">
              <span className="text-gray-300" aria-hidden="true">/</span>
              {isLast ? (
                <span className="font-medium text-gray-700" aria-current="page">{label}</span>
              ) : (
                <Link to={href} className="hover:text-brand-600 transition-colors">{label}</Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
