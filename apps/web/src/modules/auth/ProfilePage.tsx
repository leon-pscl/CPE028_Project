import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { db } from '../../lib/database'
interface UserProfile {
  full_name: string | null
  role: string
  created_at: string
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const loadProfile = async () => {
      setLoading(true)
      try {
        const { data, error: dbError } = await db.users.getProfile(user.id)
        if (dbError) throw dbError
        setProfile(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user])

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Please log in to view your profile</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium text-gray-900">Profile</h2>
          </div>

          {loading ? (
            <div className="px-6 py-8 text-center">
              Loading profile...
            </div>
          ) : error ? (
            <div className="px-6 py-4 bg-red-50 text-red-500">
              {error}
            </div>
          ) : profile ? (
            <div className="px-6 py-8 space-y-6">
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-500">Full Name</p>
                <p className="mt-1 text-lg text-gray-900">{profile.full_name || 'Not provided'}</p>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="mt-1 text-lg text-gray-900">{user.email}</p>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-500">Role</p>
                <p className="mt-1 text-lg text-gray-900">
                  {profile.role === 'shop_admin' ? 'Shop Administrator' : 'Consumer'}
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-500">Member Since</p>
                <p className="mt-1 text-lg text-gray-900">
                  {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              No profile data available
            </div>
          )}
        </div>
      </div>
    </div>
  )
}