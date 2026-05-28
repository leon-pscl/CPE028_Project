import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'

import Navbar from './components/Navbar'
import Home from './components/Home'
import Assess from './features/assess/AssessPage'
import Navigate from './features/navigate/NavigatePage'
import Connect from './features/connect/ConnectPage'

import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import ProfilePage from './features/auth/ProfilePage'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage'
import AuthCallbackPage from './features/auth/AuthCallbackPage'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/assess" element={<Assess />} />
            <Route path="/navigate" element={<Navigate />} />
            <Route path="/connect" element={<Connect />} />

            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

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
