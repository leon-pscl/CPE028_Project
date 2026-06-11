import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { db } from '../../lib/database'
import { useNavigate } from 'react-router-dom'
import type { AssessmentResult, DeviceFormData } from '@/types'

interface AssessmentRecord {
  id: string
  result_json: Record<string, unknown>
  form_json: Record<string, unknown>
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  consumer: 'Consumer',
  moderator: 'Moderator',
  admin: 'Administrator',
}

export default function ProfilePage() {
  const { user, signOut, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [history, setHistory] = useState<AssessmentRecord[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    db.assessmentResults.getByUserId(user.id).then(({ data }) => {
      setHistory(data as AssessmentRecord[])
      setHistoryLoading(false)
    })
  }, [user])

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
    <div className="min-h-screen bg-canvas py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-ink mb-8">Your profile</h1>

        {saved && (
          <div className="mb-6 rounded-md bg-ink/5 border border-ink px-4 py-3 text-sm text-ink">
            Profile updated successfully.
          </div>
        )}

        <div className="bg-surface rounded-md border border-ink divide-y divide-ink">

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
                  className="input-outlined"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-md border border-ink bg-ink px-4 py-2 text-sm font-medium text-surface hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setFullName(user.fullName ?? '') }}
                    className="rounded-md border border-ink bg-canvas px-4 py-2 text-sm text-ink hover:bg-surface transition"
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
            className="w-full rounded-md border border-ink bg-canvas px-4 py-2.5 text-sm text-ink hover:bg-surface active:bg-divider transition"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto mt-12">
        <h2 className="text-xl font-bold text-ink mb-4">Assessment History</h2>
        {historyLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : !history || history.length === 0 ? (
          <div className="bg-surface rounded-md border border-ink p-6 text-center">
            <p className="text-sm text-muted">No assessments yet.</p>
            <a href="/assess" className="mt-3 inline-block rounded-md border border-ink bg-purple px-4 py-2 text-sm font-semibold text-ink hover:opacity-90">
              Take an assessment
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((record: AssessmentRecord) => {
              const result = record.result_json as unknown as AssessmentResult
              const form = record.form_json as unknown as DeviceFormData
              const isRepair = result.direction === 'REPAIR'
              return (
                <button
                  key={record.id}
                  onClick={() => navigate(`/navigate/${record.id}`)}
                  className="w-full bg-surface rounded-md border border-ink p-4 flex items-center justify-between text-left hover:bg-canvas transition cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">
                      {isRepair ? 'Repair' : 'Recycle'} — {form.brand} {form.model}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      Score {result.score}/100 · {form.ageMonths}mo old
                      {result.issue && <> · {result.issue}</>}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(record.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded ${
                    isRepair
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {result.direction}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
