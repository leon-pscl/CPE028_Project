import { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './hooks/useAuth'

import Sidebar from './components/Sidebar'
import Breadcrumbs from './components/Breadcrumbs'
import Home from './components/Home'
import Assess from './features/assess/AssessPage'
import Navigate from './features/navigate/NavigatePage'
import Connect from './features/connect/ConnectPage'
import LoadingScreen from './components/LoadingScreen'

import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import ProfilePage from './features/auth/ProfilePage'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage'
import AuthCallbackPage from './features/auth/AuthCallbackPage'

// Routes that render their own full-bleed layout (no sidebar / breadcrumbs).
const FULL_BLEED_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/callback',
]

function AppShell() {
  const { pathname } = useLocation()
  const isFullBleed = FULL_BLEED_ROUTES.some((p) => pathname.startsWith(p))
  const { user } = useAuth()

  if (isFullBleed) {
    return (
      <main id="main-content" className="min-h-screen outline-none">
        <Routes>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
        </Routes>
      </main>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Sidebar />
      <main
        id="main-content"
        className="md:pl-sidebar outline-none min-h-screen relative z-10"
      >
        <div className="px-4 sm:px-6 lg:px-8 pt-16 md:pt-0">
          {!user && <Breadcrumbs />}
        </div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/assess"
            element={
              <ProtectedRoute>
                <Assess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/navigate"
            element={
              <ProtectedRoute>
                <Navigate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/connect"
            element={
              <ProtectedRoute>
                <Connect />
              </ProtectedRoute>
            }
          />

          <Route
            path="/auth/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const [appLoading, setAppLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => setAppLoading(false), 1500)
  }, [])

  return (
    <AuthProvider>
      {appLoading && <LoadingScreen onComplete={() => setAppLoading(false)} />}
      {!appLoading && <AppShell />}
    </AuthProvider>
  )
}