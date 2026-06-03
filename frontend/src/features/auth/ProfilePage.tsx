import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

const ROLE_LABELS: Record<string, string> = {
  consumer: 'Consumer',
  technician: 'Technician',
  admin: 'Administrator',
}

export default function ProfilePage() {
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
    <div className="min-h-screen bg-canvas py-12 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-ink mb-8">Your profile</h1>

        {saved && (
          <div className="mb-6 rounded-lg bg-ink/5 border border-ink/20 px-4 py-3 text-sm text-ink">
            Profile updated successfully.
          </div>
        )}

        <div className="bg-surface rounded-2xl shadow-sm border border-divider divide-y divide-divider">

          <div className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-purple/30 flex items-center justify-center text-xl font-bold text-ink shrink-0">
              {(user.fullName ?? user.email)[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-ink">{user.fullName ?? '—'}</p>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Role</span>
              <span className="font-medium text-ink">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Email verified</span>
              <span className="font-medium text-ink">
                {user.emailConfirmed ? 'Yes' : 'Pending'}
              </span>
            </div>
          </div>

          <div className="p-6">
            {editing ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-ink">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-surface hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setFullName(user.fullName ?? '') }}
                    className="rounded-lg border border-divider px-4 py-2 text-sm text-ink hover:bg-canvas transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-ink font-medium hover:opacity-70"
              >
                Edit profile
              </button>
            )}
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={signOut}
            className="w-full rounded-lg border border-divider px-4 py-2.5 text-sm text-ink hover:bg-canvas active:bg-divider transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}