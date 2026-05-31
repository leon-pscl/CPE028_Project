import { Link } from 'react-router-dom'
import { ClipboardCheck, Recycle, MapPin, ArrowRight, Phone, Laptop } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const modules = [
  {
    to: '/assess',
    icon: ClipboardCheck,
    title: 'Assess',
    description: 'Tell us about your device and its issue. Get a personalized repair-or-recycle score with cost estimates.',
    color: 'brand',
    action: 'Start Assessment',
  },
  {
    to: '/navigate',
    icon: Recycle,
    title: 'Navigate',
    description: 'Follow a step-by-step roadmap tailored to your decision. Track your progress offline.',
    color: 'brand',
    action: 'View Roadmap',
  },
  {
    to: '/connect',
    icon: MapPin,
    title: 'Connect',
    description: 'Find verified repair shops and recycling facilities near you across the Philippines.',
    color: 'brand',
    action: 'Find a Shop',
  },
]

export default function Home() {
  const { user, loading: authLoading } = useAuth()

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Repair or Recycle?
              <span className="block text-brand-200">Make the right choice.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-brand-100">
              ReDevice helps Filipinos make informed decisions about their defective smartphones and laptops. Get a personalized score, follow a guided roadmap, and connect with verified local resources.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/assess" className="btn-primary bg-white text-brand-700 hover:bg-brand-50 shadow-lg px-8 py-3 text-base">
                Start Your Assessment
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/connect" className="btn-secondary border-white text-brand-700 bg-white hover:bg-white/90 hover:text-brand-900 px-8 py-3 text-base">
                Find a Shop Near You
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Auth status section */}
      {!authLoading && (
        <section className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              {user ? (
                <>
                  <p className="text-sm font-medium text-gray-600">
                    Welcome, {user.email?.split('@')[0] || 'User'}!
                  </p>
                  <Link 
                    to="/auth/profile" 
                    className="text-sm text-brand-600 hover:text-brand-700"
                  >
                    View Profile
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-600">
                    Not logged in
                  </p>
                  <div className="flex gap-2">
                    <Link 
                      to="/auth/login" 
                      className="btn-outline border-brand-200 text-brand-600 hover:bg-brand-50 px-3 py-1 rounded text-xs"
                    >
                      Login
                    </Link>
                    <Link 
                      to="/auth/register" 
                      className="btn-primary bg-brand-600 text-white hover:bg-brand-700 px-3 py-1 rounded text-xs"
                    >
                      Register
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Device types */}
      <section className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="grid grid-cols-3 gap-8 items-center justify-items-center text-gray-500">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-medium">Smartphones</span>
            </div>
            <div className="flex items-center gap-2">
              <Laptop className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-medium">Laptops</span>
            </div>
            <div className="flex items-center gap-2">
              <Recycle className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-medium">E-Waste Recycling</span>
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Three steps to responsible disposal
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From assessment to action — we guide you through every step.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ to, icon: Icon, title, description, action }) => (
              <Link
                key={to}
                to={to}
                className="group card transition-all hover:shadow-md hover:border-brand-200 cursor-pointer"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">{description}</p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-brand-600 group-hover:text-brand-700">
                  {action}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SDG Impact */}
      <section className="bg-white border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-3 text-center">
            <div>
              <div className="text-3xl font-bold text-brand-600">SDG 12.4.2</div>
              <p className="mt-1 text-sm text-gray-600">Hazardous Waste Management</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand-600">SDG 12.5.1</div>
              <p className="mt-1 text-sm text-gray-600">Waste Reduction via Recycling</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand-600">Philippines</div>
              <p className="mt-1 text-sm text-gray-600">Local verified resources</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
