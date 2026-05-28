import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'   // <-- updated path
import { ProtectedRoute } from './components/ProtectedRoute'

// Existing pages — unchanged
import Navbar from './components/Navbar'
import Home from './components/Home'
import Assess from './modules/assess/AssessPage'
import Navigate from './modules/navigate/NavigatePage'
import Connect from './modules/connect/ConnectPage'

// Auth pages
import { LoginPage } from './modules/auth/LoginPage'
import { RegisterPage } from './modules/auth/RegisterPage'
import { ProfilePage } from './modules/auth/ProfilePage'
import { ForgotPasswordPage } from './modules/auth/ForgotPasswordPage'
import { AuthCallbackPage } from './modules/auth/AuthCallbackPage'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-16">
          <Routes>
            {/* ── Public routes (unchanged) ── */}
            <Route path="/" element={<Home />} />
            <Route path="/assess" element={<Assess />} />
            <Route path="/navigate" element={<Navigate />} />
            <Route path="/connect" element={<Connect />} />

            {/* ── Auth routes ── */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* ── Protected routes ── */}
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
    </AuthProvider>
  )
}
