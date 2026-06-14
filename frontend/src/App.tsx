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
import NavigatePlaceholder from './features/navigate/NavigatePlaceholder'
import Connect from './features/connect/ConnectPage'
import AdminReviewPage from './features/admin/AdminReviewPage'
import LoadingScreen from './components/LoadingScreen'
import NotFoundPage from './components/NotFoundPage'

import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import ProfilePage from './features/auth/ProfilePage'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage'
import ResetPasswordPage from './features/auth/ResetPasswordPage'
import AuthCallbackPage from './features/auth/AuthCallbackPage'
import PrivacyPolicyPage from './features/legal/PrivacyPolicyPage'
import TermsOfServicePage from './features/legal/TermsOfServicePage'

const FULL_BLEED_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/callback',
  '/privacy-policy',
  '/terms-of-service',
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
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="*" element={<NotFoundPage />} />
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
                <NavigatePlaceholder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/navigate/:assessmentId"
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

          <Route
            path="/admin/review"
            element={
              <ProtectedRoute requiredRole="moderator">
                <AdminReviewPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
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
