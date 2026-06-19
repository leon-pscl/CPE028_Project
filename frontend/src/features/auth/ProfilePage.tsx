import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { db } from '../../lib/database'
import { useNavigate } from 'react-router-dom'
import { getRoadmapPhases } from '../navigate/roadmapData'
import { Trash2, AlertTriangle, ChevronDown } from 'lucide-react'
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

// ── Delete confirmation modal ────────────────────────────────────

interface DeleteModalProps {
  record: AssessmentRecord
  onConfirm: () => Promise<void>
  onCancel: () => void
  isDeleting: boolean
}

function DeleteConfirmModal({ record, onConfirm, onCancel, isDeleting }: DeleteModalProps) {
  const result = record.result_json as unknown as AssessmentResult
  const form   = record.form_json   as unknown as DeviceFormData
  const label  = `${result.direction === 'REPAIR' ? 'Repair' : 'Recycle'} — ${form.brand} ${form.model}`

  // Close on backdrop click (but not while deleting)
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDeleting && e.target === e.currentTarget) onCancel()
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isDeleting, onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-sm rounded-xl bg-surface shadow-xl border border-divider p-6">
        {/* Icon + heading */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 border border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
          </div>
          <h2 id="delete-modal-title" className="text-base font-semibold text-ink">
            Delete assessment?
          </h2>
        </div>

        {/* Body */}
        <p className="text-sm text-muted mb-2">
          This will permanently delete the assessment and its roadmap progress. This cannot be undone.
        </p>
        <div className="rounded-lg border border-divider bg-canvas px-3 py-2 mb-5">
          <p className="text-sm font-medium text-ink truncate">{label}</p>
          <p className="text-xs text-muted mt-0.5">
            {new Date(record.created_at).toLocaleDateString('en-PH', {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCancel()
            }}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-ink bg-canvas px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              console.log('[DeleteConfirmModal] Delete button clicked, record id:', record.id)
              onConfirm()
            }}
            disabled={isDeleting}
            className="relative z-10 flex-1 rounded-lg bg-red-600 border border-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-60 cursor-pointer"
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
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

  // Delete state
  const [pendingDelete, setPendingDelete] = useState<AssessmentRecord | null>(null)
  const [isDeleting, setIsDeleting]       = useState(false)
  const [deleteError, setDeleteError]     = useState<string | null>(null)

  // Collapsible history state
  const [historyOpen, setHistoryOpen] = useState(true)
  const [showAll, setShowAll]         = useState(false)

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

  // ── Delete handlers ──────────────────────────────────────────

  const handleDeleteRequest = useCallback((e: React.MouseEvent, record: AssessmentRecord) => {
    e.stopPropagation() // don't navigate to roadmap when clicking delete
    setDeleteError(null)
    setPendingDelete(record)
  }, [])

  const handleDeleteCancel = useCallback(() => {
    if (!isDeleting) setPendingDelete(null)
  }, [isDeleting])

  const handleDeleteConfirm = useCallback(async () => {
    console.log('[ProfilePage] handleDeleteConfirm fired, pendingDelete:', pendingDelete?.id)
    if (!pendingDelete) {
      console.warn('[ProfilePage] handleDeleteConfirm bailed early — pendingDelete is null')
      return
    }
    setIsDeleting(true)
    setDeleteError(null)


    const TIMEOUT_MS = 10_000
    const timeout = new Promise<{ error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ error: { message: 'Request timed out. Please try again.' } }), TIMEOUT_MS),
    )

    let error: { message: string } | null = null
    try {
      const result = await Promise.race([
        db.assessmentResults.delete(pendingDelete.id),
        timeout,
      ])
      error = result.error
    } catch (err) {

      error = { message: err instanceof Error ? err.message : 'Failed to delete. Please try again.' }
    }

    if (error) {
      setIsDeleting(false)
      setDeleteError(error.message || 'Failed to delete. Please try again.')
      return
    }

    // Clean up local storage entries so progress bar data is gone immediately
    try {
      localStorage.removeItem(`roadmap_progress:${pendingDelete.id}`)
      sessionStorage.removeItem(`assessment_${pendingDelete.id}`)
    } catch { /* ignore storage errors */ }

    // Optimistic UI update — remove from list instantly
    setHistory((prev) => prev?.filter((r) => r.id !== pendingDelete.id) ?? null)
    setIsDeleting(false)
    setPendingDelete(null)
  }, [pendingDelete, isDeleting])

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
    <>
      {/* Delete modal rendered outside the scroll container so it overlays everything */}
      {pendingDelete && (
        <DeleteConfirmModal
          record={pendingDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isDeleting={isDeleting}
        />
      )}

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

        {/* ── Assessment History ─────────────────────────────── */}
        <div className="max-w-lg mx-auto mt-12">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex w-full items-center justify-between mb-4 group"
          >
            <h2 className="text-xl font-bold text-ink">Assessment History</h2>
            <ChevronDown
              className={`h-5 w-5 text-muted transition-transform duration-200 ${historyOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {!historyOpen ? null : (
            <>
              {historyError && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {historyError}
                </div>
              )}

              {deleteError && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {deleteError}
                </div>
              )}

              {historyLoading ? (
                <p className="text-sm text-muted">Loading…</p>
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
                <>
                  <div className="space-y-3">
                    {(showAll ? history : history.slice(0, 5)).map((record: AssessmentRecord) => {
                      const result   = record.result_json as unknown as AssessmentResult
                      const form     = record.form_json   as unknown as DeviceFormData
                      const isRepair = result.direction === 'REPAIR'

                      return (
                        <div key={record.id} className="relative group">
                          {/* Card — navigates to roadmap */}
                          <button
                            onClick={() => navigate(`/navigate/${record.id}`)}
                            className="w-full bg-surface rounded-md border border-ink p-4 text-left hover:bg-canvas transition cursor-pointer pr-12"
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

                          {/* Delete button — sits on top-right corner, outside the nav button flow */}
                          <button
                            onClick={(e) => handleDeleteRequest(e, record)}
                            aria-label={`Delete assessment for ${form.brand} ${form.model}`}
                            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-muted opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 focus:opacity-100 transition-all duration-150"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {history.length > 5 && !showAll && (
                    <button
                      onClick={() => setShowAll(true)}
                      className="mt-3 w-full text-center text-sm text-muted hover:text-ink transition"
                    >
                      Show all {history.length} assessments
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
