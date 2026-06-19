import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { db } from '../../lib/database'
import { useNavigate } from 'react-router-dom'
import { getRoadmapPhases } from '../navigate/roadmapData'
import type { AssessmentResult, DeviceFormData } from '@/types'

interface AssessmentRecord {
  id: string
  result_json: Record<string, unknown>
  form_json: Record<string, unknown>
  created_at: string
}

interface RoadmapProgressRecord {
  completed_step_ids: string[]
  completed_sub_ids: string[]
}

const ROLE_LABELS: Record<string, string> = {
  consumer: 'Consumer',
  moderator: 'Moderator',
  admin: 'Administrator',
}

// ── Progress bar helpers ─────────────────────────────────────────

function computeTotals(direction: 'REPAIR' | 'RECYCLE') {
  const phases = getRoadmapPhases(direction)
  let steps = 0
  let subs  = 0
  for (const ph of phases) {
    for (const s of ph.steps) {
      steps++
      subs += s.subItems?.length ?? 0
    }
  }
  return { steps, subs, total: steps + subs }
}

function computeDone(prog: RoadmapProgressRecord) {
  return (prog.completed_step_ids?.length ?? 0) + (prog.completed_sub_ids?.length ?? 0)
}

// ── Progress bar component ───────────────────────────────────────

function RoadmapProgressBar({
  assessmentId,
  direction,
}: {
  assessmentId: string
  direction: 'REPAIR' | 'RECYCLE'
}) {
  const [prog, setProg]       = useState<RoadmapProgressRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check localStorage first for instant render
    try {
      const raw = localStorage.getItem(`roadmap_progress:${assessmentId}`)
      if (raw) {
        const snap = JSON.parse(raw)
        setProg({
          completed_step_ids: snap.completedStepIds ?? [],
          completed_sub_ids:  snap.completedSubIds  ?? [],
        })
        setLoading(false)
        return
      }
    } catch { /* ignore */ }

    // Fall back to Supabase
    db.roadmapProgress.getByAssessmentId(assessmentId).then(({ data }) => {
      if (data) setProg(data as unknown as RoadmapProgressRecord)
      setLoading(false)
    })
  }, [assessmentId])

  const { total } = computeTotals(direction)
  const done = prog ? computeDone(prog) : 0
  const pct  = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0

  if (loading) {
    return (
      <div className="mt-2.5 h-1.5 w-full rounded-full bg-divider animate-pulse" />
    )
  }

  // Not started yet
  if (!prog || done === 0) {
    return (
      <div className="mt-2.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-divider" />
        <span className="shrink-0 text-[10px] font-semibold text-muted">Not started</span>
      </div>
    )
  }

  const isComplete = pct >= 100
  const barColor = isComplete
    ? 'bg-ink'
    : direction === 'REPAIR'
      ? 'bg-brand-600'
      : 'bg-amber-500'

  return (
    <div className="mt-2.5 flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-divider overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`shrink-0 text-[10px] font-semibold ${isComplete ? 'text-ink' : 'text-muted'}`}>
        {isComplete ? '✓ Done' : `${pct}%`}
      </span>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, signOut, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing]           = useState(false)
  const [fullName, setFullName]         = useState(user?.fullName ?? '')
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [history, setHistory]           = useState<AssessmentRecord[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    db.assessmentResults.getByUserId(user.id).then(({ data, error }) => {
      if (error) {
        console.error('Failed to load assessment history:', error)
        setHistoryError('Could not load assessment history.')
      } else {
        setHistory(data as AssessmentRecord[])
      }
      setHistoryLoading(false)
    }).catch((e) => {
      console.error('Failed to load assessment history:', e)
      setHistoryError('Could not load assessment history.')
      setHistoryLoading(false)
    })
  }, [user])

  if (!user) return null

  async function handleSave() {
    const trimmed = fullName.trim()
    if (!trimmed) return
    if (trimmed.length > 100) return
    setSaving(true)
    await updateProfile({ fullName: trimmed })
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
              <p className="font-semibold text-ink truncate max-w-[200px]">{user.fullName ?? '—'}</p>
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
                  maxLength={100}
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

      {/* ── Assessment History ─────────────────────────────── */}
      <div className="max-w-lg mx-auto mt-12">
        <h2 className="text-xl font-bold text-ink mb-4">Assessment History</h2>

        {historyLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : historyError ? (
          <div className="bg-surface rounded-md border border-red-200 p-6 text-center">
            <p className="text-sm text-red-600">{historyError}</p>
          </div>
        ) : !history || history.length === 0 ? (
          <div className="bg-surface rounded-md border border-ink p-6 text-center">
            <p className="text-sm text-muted">No assessments yet.</p>
            <a
              href="/assess"
              className="mt-3 inline-block rounded-md border border-ink bg-purple px-4 py-2 text-sm font-semibold text-ink hover:opacity-90"
            >
              Take an assessment
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((record: AssessmentRecord) => {
              const result    = record.result_json as unknown as AssessmentResult
              const form      = record.form_json   as unknown as DeviceFormData
              const isRepair  = result.direction === 'REPAIR'

              return (
                <button
                  key={record.id}
                  onClick={() => navigate(`/navigate/${record.id}`)}
                  className="w-full bg-surface rounded-md border border-ink p-4 text-left hover:bg-canvas transition cursor-pointer group"
                >
                  {/* Top row: title + direction badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">
                        {isRepair ? 'Repair' : 'Recycle'} — {form.brand} {form.model}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        Score {result.score}/100 · {form.ageMonths}mo old
                        {result.issue ? ` · ${result.issue}` : ''}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(record.created_at).toLocaleDateString('en-PH', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
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
                  </div>

                  {/* Progress bar */}
                  <RoadmapProgressBar
                    assessmentId={record.id}
                    direction={result.direction}
                  />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
