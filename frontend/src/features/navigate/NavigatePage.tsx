import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { CheckCircle2, Circle, MapPin, AlertCircle, ArrowRight, Info, Download, ExternalLink, Lock } from 'lucide-react'
import { getRoadmapSteps } from './roadmapData'
import { useAuth } from '../../hooks/useAuth'
import type { RoadmapStep, RoadmapSubItem, AssessmentResult, AssessmentDirection } from '@/types'

const STEP_TYPE_ICONS = {
  action: CheckCircle2,
  info: Info,
  download: Download,
  referral: ExternalLink,
}

function AuthGateModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusable = el.querySelectorAll<HTMLElement>('a, button')
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="navgate-title"
    >
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div ref={dialogRef} className="relative w-full max-w-sm rounded-2xl bg-surface p-8 shadow-2xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple/30">
          <Lock className="h-7 w-7 text-ink" aria-hidden="true" />
        </div>
        <h2 id="navgate-title" className="text-xl font-bold text-ink">Sign in to continue</h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Your repair and recycle roadmap is saved to your account. Sign in or create a free account to access it.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/auth/login"
            className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-surface hover:opacity-90 transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/auth/register"
            className="w-full rounded-lg border border-divider px-4 py-2.5 text-sm font-semibold text-ink hover:bg-canvas transition-colors"
          >
            Create account
          </Link>
          <button
            onClick={onClose}
            className="text-xs text-muted hover:text-ink transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}

function SubNode({ item, onToggle }: { item: RoadmapSubItem; onToggle: (id: string) => void }) {
  const isLeft = item.branch === 'left'

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle(item.id)
    }
  }

  return (
    <div className={`flex items-center ${isLeft ? 'flex-row' : 'flex-row-reverse'} gap-3`}>
      <div className={`w-16 shrink-0 ${isLeft ? '' : 'hidden sm:block'}`} />
      <div
        onClick={() => onToggle(item.id)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`${item.title}: ${item.completed ? 'completed' : 'not completed'}`}
        className={`group relative flex w-full max-w-[220px] cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-left transition-all hover:shadow-md focus-visible:outline-2 focus-visible:outline-ink ${
          item.completed
            ? 'border-ink/30 bg-ink/5'
            : 'border-divider bg-surface hover:border-ink/30'
        }`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(item.id) }}
          className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
            item.completed
              ? 'border-ink bg-ink text-surface'
              : 'border-divider group-hover:border-ink/50'
          }`}
          aria-label={`Mark "${item.title}" as ${item.completed ? 'incomplete' : 'complete'}`}
        >
          {item.completed && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
        <div className="min-w-0">
          <p className={`text-sm font-medium leading-tight ${item.completed ? 'text-ink' : 'text-ink'}`}>
            {item.title}
          </p>
          <p className="mt-0.5 text-xs text-muted leading-snug">{item.description}</p>
        </div>
      </div>
    </div>
  )
}

function MainNode({
  step,
  index,
  total,
  direction,
  onToggle,
}: {
  step: RoadmapStep
  index: number
  total: number
  direction: AssessmentDirection
  onToggle: (id: string) => void
}) {
  const Icon = STEP_TYPE_ICONS[step.type]
  const isRecommended = step.recommended && !step.completed
  const leftItems = step.subItems?.filter(i => i.branch === 'left') ?? []
  const rightItems = step.subItems?.filter(i => i.branch === 'right') ?? []
  const hasSubItems = leftItems.length > 0 || rightItems.length > 0
  const maxSubRows = Math.max(leftItems.length, rightItems.length)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle(step.id)
    }
  }

  return (
    <div className="relative">
      {index > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-8 w-0.5 h-8 bg-divider" />
      )}

      {hasSubItems && (
        <div className="relative mb-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-0">
            <div className="flex flex-col items-end gap-3 pr-4">
              {leftItems.map(item => (
                <div key={item.id} className="w-full flex justify-end">
                  <SubNode item={item} onToggle={onToggle} />
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-6 bg-divider" />
              <div className="relative w-full h-0.5">
                <div className="absolute left-0 right-0 top-0 h-0.5 bg-divider" />
              </div>
              <div className="w-0.5 h-6 bg-divider" />
            </div>
            <div className="flex flex-col items-start gap-3 pl-4">
              {rightItems.map(item => (
                <div key={item.id} className="w-full flex justify-start">
                  <SubNode item={item} onToggle={onToggle} />
                </div>
              ))}
            </div>
          </div>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} aria-hidden="true">
            {leftItems.map((_, i) => (
              <line
                key={`left-${i}`}
                x1="50%"
                y1={`${(i + 0.5) * (100 / maxSubRows)}%`}
                x2="33%"
                y2={`${(i + 0.5) * (100 / maxSubRows)}%`}
                stroke="#d1d5db"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            ))}
            {rightItems.map((_, i) => (
              <line
                key={`right-${i}`}
                x1="50%"
                y1={`${(i + 0.5) * (100 / maxSubRows)}%`}
                x2="67%"
                y2={`${(i + 0.5) * (100 / maxSubRows)}%`}
                stroke="#d1d5db"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            ))}
          </svg>
        </div>
      )}

      <div className="relative z-10 flex items-center gap-4">
        <div className="hidden sm:flex flex-col items-center w-12 shrink-0">
          <span className="text-xs font-semibold text-muted">{index + 1}</span>
        </div>
        <div
          onClick={() => onToggle(step.id)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label={`${step.title}: ${step.completed ? 'completed' : 'not completed'}`}
          className={`group relative flex-1 cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-lg focus-visible:outline-2 focus-visible:outline-ink ${
            step.completed
              ? 'border-ink/30 bg-ink/5'
              : isRecommended
                ? 'border-purple bg-purple/20'
                : 'border-divider bg-surface hover:border-ink/30'
          }`}
        >
          <div className="flex items-start gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(step.id) }}
              className={`mt-0.5 h-7 w-7 shrink-0 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                step.completed
                  ? 'border-ink bg-ink text-surface'
                  : isRecommended
                    ? 'border-purple bg-purple/30 text-ink'
                    : 'border-divider text-muted group-hover:border-ink/50'
              }`}
              aria-label={`Mark "${step.title}" as ${step.completed ? 'incomplete' : 'complete'}`}
            >
              {step.completed ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-4 w-4" aria-hidden="true" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center justify-center rounded-md p-1 ${
                  step.completed ? 'bg-ink/10 text-ink' : isRecommended ? 'bg-purple/30 text-ink' : 'bg-canvas text-muted'
                }`}>
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <h3 className={`font-semibold text-base ${
                  step.completed ? 'text-ink' : isRecommended ? 'text-ink' : 'text-ink'
                }`}>
                  {step.title}
                </h3>
              </div>
              <p className={`mt-1 text-sm ${
                step.completed ? 'text-muted' : isRecommended ? 'text-ink' : 'text-muted'
              }`}>
                {step.description}
              </p>
              {step.type === 'referral' && index === total - 1 && (
                <Link
                  to="/connect"
                  state={{ direction }}
                  className="btn-purple mt-3 inline-flex items-center gap-2"
                >
                  Find a {direction === 'REPAIR' ? 'repair shop' : 'drop-off point'}
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </div>
            {hasSubItems && (
              <div className="hidden sm:flex flex-col items-center gap-1 text-muted">
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NavigatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const state = location.state as { result?: AssessmentResult; form?: { brand: string } } | null

  const [showAuthGate, setShowAuthGate] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      setShowAuthGate(false)
    }
  }, [authLoading, user])

  const direction: AssessmentDirection = state?.result?.direction ?? 'REPAIR'
  const deviceName = state?.form ? `${state.form.brand} device` : 'your device'

  const [steps, setSteps] = useState<RoadmapStep[]>(() => getRoadmapSteps(direction))

  useEffect(() => {
    setSteps(getRoadmapSteps(direction))
  }, [direction])

  const toggleStep = (id: string) => {
    if (!user) {
      setShowAuthGate(true)
      return
    }
    setSteps(prev => prev.map(s => {
      if (s.id === id) return { ...s, completed: !s.completed }
      if (s.subItems) {
        return {
          ...s,
          subItems: s.subItems.map(sub => sub.id === id ? { ...sub, completed: !sub.completed } : sub),
        }
      }
      return s
    }))
  }

  const completedCount = steps.reduce((acc, s) => {
    let count = s.completed ? 1 : 0
    if (s.subItems) count += s.subItems.filter(sub => sub.completed).length
    return acc + count
  }, 0)
  const totalCount = steps.reduce((acc, s) => acc + 1 + (s.subItems?.length ?? 0), 0)
  const progress = Math.round((completedCount / totalCount) * 100)
  const isComplete = completedCount === totalCount

  const notAuthed = !authLoading && !user

  return (
    <div className="min-h-screen bg-section-roadmap">
      {showAuthGate && <AuthGateModal onClose={() => setShowAuthGate(false)} />}

      <div className="page-container-sm">
        {notAuthed && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-ink/20 bg-ink/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-ink">
              <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Sign in to save your progress and interact with the roadmap.</span>
            </div>
            <button
              onClick={() => setShowAuthGate(true)}
              className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-surface hover:opacity-90 transition-colors"
            >
              Sign in
            </button>
          </div>
        )}

        <div className="relative">
          <div className={notAuthed ? 'blur-sm' : ''}>
            <div className="rounded-2xl bg-surface p-6 shadow-sm sm:p-8">
              <div className="mb-8">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-ink sm:text-3xl">Your Roadmap</h1>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-ink/10 text-ink">
                    {direction}
                  </span>
                </div>
                <p className="mt-1 text-muted">Follow these steps to responsibly handle {deviceName}.</p>
              </div>

              <div className="mb-8 rounded-xl border border-divider bg-canvas p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">Progress</span>
                  <span className="text-muted">{completedCount} of {totalCount} steps</span>
                </div>
                <div
                  className="mt-2 h-2.5 w-full rounded-full bg-divider"
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${progress}% complete`}
                >
                  <div
                    className="h-2.5 rounded-full transition-all bg-ink"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {isComplete && (
                  <div className="mt-3 flex items-center gap-2 text-sm font-medium text-ink">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    All steps completed!
                  </div>
                )}
              </div>

              {direction === 'RECYCLE' && (
                <div className="mb-8 flex items-start gap-3 rounded-lg border border-ink/20 bg-ink/5 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-ink" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-ink">Data wipe is mandatory</p>
                    <p className="mt-1 text-sm text-muted">Before recycling, make sure all personal data is permanently erased from your device.</p>
                  </div>
                </div>
              )}

              <div className="relative">
                <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-divider hidden sm:block" />
                <div className="space-y-8">
                  {steps.map((step, index) => (
                    <MainNode
                      key={step.id}
                      step={step}
                      index={index}
                      total={steps.length}
                      direction={direction}
                      onToggle={toggleStep}
                    />
                  ))}
                </div>
              </div>

              {!state?.result && (
                <div className="mt-10 text-center">
                  <p className="text-sm text-muted">
                    No assessment found.{' '}
                    <button onClick={() => navigate('/assess')} className="font-medium text-ink hover:opacity-70 cursor-pointer">
                      Take an assessment first
                    </button>
                  </p>
                </div>
              )}
            </div>
          </div>

          {notAuthed && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl">
              <div className="rounded-xl bg-surface/90 backdrop-blur-sm border border-divider px-8 py-6 text-center shadow-lg max-w-sm">
                <Lock className="mx-auto h-8 w-8 text-muted mb-3" aria-hidden="true" />
                <p className="text-sm font-medium text-ink">Sign in to view your roadmap</p>
                <p className="mt-1 text-xs text-muted">Follow a step-by-step roadmap tailored to your repair or recycle decision.</p>
                <button
                  onClick={() => setShowAuthGate(true)}
                  className="mt-4 rounded-lg bg-ink px-5 py-2 text-sm font-semibold text-surface hover:opacity-90 transition-colors"
                >
                  Sign in
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}