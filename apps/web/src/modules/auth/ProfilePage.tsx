/**
 * modules/auth/ProfilePage.tsx
 *
 * Protected profile page. Only reachable when authenticated.
 * Shows the user's details and allows updating full name.
 */

import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

const ROLE_LABELS: Record<string, string> = {
  consumer: 'Consumer',
  technician: 'Technician',
  admin: 'Administrator',
}

export function ProfilePage() {
  const { user, signOut, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!user) return null

  async function handleSave() {
    setSaving(true)
    await updateProfile({ fullName })
    setSaving(false)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Your profile</h1>

        {saved && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Profile updated successfully.
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">

          {/* Avatar + name */}
          <div className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-xl font-bold text-green-700 flex-shrink-0">
              {(user.fullName ?? user.email)[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user.fullName ?? '—'}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Role</span>
              <span className="font-medium text-gray-800">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Email verified</span>
              <span className="font-medium text-green-600">
                {user.emailConfirmed ? 'Yes' : 'Pending'}
              </span>
            </div>
          </div>

          {/* Edit name */}
          <div className="p-6">
            {editing ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white
                               hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setFullName(user.fullName ?? '') }}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-green-600 font-medium hover:text-green-700"
              >
                Edit profile
              </button>
            )}
          </div>
        </div>

        {/* Sign out */}
        <div className="mt-6">
          <button
            onClick={signOut}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600
                       hover:bg-gray-50 active:bg-gray-100 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
