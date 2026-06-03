import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { CheckCircle2, Circle, MapPin, AlertCircle, ArrowRight, Info, Download, ExternalLink } from 'lucide-react'
import { getRoadmapSteps } from './roadmapData'
import type { RoadmapStep, RoadmapSubItem, AssessmentResult, AssessmentDirection } from '@/types'

const STEP_TYPE_ICONS = {
  action: CheckCircle2,
  info: Info,
  download: Download,
  referral: ExternalLink,
}

function SubNode({ item, onToggle }: { item: RoadmapSubItem; onToggle: (id: string) => void }) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle(item.id)
    }
  }

  return (
    <div
      onClick={() => onToggle(item.id)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${item.title}: ${item.completed ? 'completed' : 'not completed'}`}
      className={`group relative flex w-full cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-left transition-all hover:shadow-md focus-visible:outline-2 focus-visible:outline-ink ${
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle(step.id)
    }
  }

  return (
    <div className="relative">
      {index > 0 && (
        <div className="absolute left-6 md:left-1/2 -translate-x-1/2 md:-translate-x-1/2 -top-8 w-0.5 h-8 bg-divider" />
      )}

      <div className="relative z-10 flex items-start gap-3 md:gap-4">
        <div className="hidden md:flex flex-col items-center w-12 shrink-0">
          <span className="text-xs font-semibold text-muted">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div
            onClick={() => onToggle(step.id)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-label={`${step.title}: ${step.completed ? 'completed' : 'not completed'}`}
            className={`group relative cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-lg focus-visible:outline-2 focus-visible:outline-ink ${
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
                  <h3 className={`font-semibold text-sm md:text-base ${
                    step.completed ? 'text-ink' : isRecommended ? 'text-ink' : 'text-ink'
                  }`}>
                    {step.title}
                  </h3>
                </div>
                <p className={`mt-1 text-xs md:text-sm ${
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
                <div className="hidden md:flex flex-col items-center gap-1 text-muted">
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>

          {/* Sub-items: stacked on mobile, branching grid on desktop */}
          {hasSubItems && (
            <div className="mt-3 md:mt-4">
              {/* Mobile: single column stack */}
              <div className="md:hidden space-y-2 pl-2 border-l-2 border-divider ml-3">
                {[...leftItems, ...rightItems].map(item => (
                  <SubNode key={item.id} item={item} onToggle={onToggle} />
                ))}
              </div>

              {/* Desktop: branching left/right grid */}
              <div className="hidden md:block relative">
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
                      y1={`${(i + 0.5) * (100 / Math.max(leftItems.length, rightItems.length))}%`}
                      x2="33%"
                      y2={`${(i + 0.5) * (100 / Math.max(leftItems.length, rightItems.length))}%`}
                      stroke="#d1d5db"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                  ))}
                  {rightItems.map((_, i) => (
                    <line
                      key={`right-${i}`}
                      x1="50%"
                      y1={`${(i + 0.5) * (100 / Math.max(leftItems.length, rightItems.length))}%`}
                      x2="67%"
                      y2={`${(i + 0.5) * (100 / Math.max(leftItems.length, rightItems.length))}%`}
                      stroke="#d1d5db"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                  ))}
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NavigatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { result?: AssessmentResult; form?: { brand: string } } | null

  const direction: AssessmentDirection = state?.result?.direction ?? 'REPAIR'
  const deviceName = state?.form ? `${state.form.brand} device` : 'your device'

  const [steps, setSteps] = useState<RoadmapStep[]>(() => getRoadmapSteps(direction))

  useEffect(() => {
    setSteps(getRoadmapSteps(direction))
  }, [direction])

  const toggleStep = (id: string) => {
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

  return (
    <div className="min-h-screen bg-section-roadmap">
      <div className="page-container-sm">
        <div className="rounded-md bg-surface p-4 sm:p-6 md:p-8">
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-ink sm:text-2xl md:text-3xl">Your Roadmap</h1>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-ink/10 text-ink">
                {direction}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">Follow these steps to responsibly handle {deviceName}.</p>
          </div>

          <div className="mb-6 md:mb-8 rounded-xl border border-divider bg-canvas p-3 md:p-4">
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
            <div className="mb-6 md:mb-8 flex items-start gap-3 rounded-lg border border-ink/20 bg-ink/5 p-3 md:p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-ink" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-ink">Data wipe is mandatory</p>
                <p className="mt-1 text-xs md:text-sm text-muted">Before recycling, make sure all personal data is permanently erased from your device.</p>
              </div>
            </div>
          )}

          <div className="relative">
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-divider hidden md:block" />
            <div className="space-y-6 md:space-y-8">
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
            <div className="mt-8 md:mt-10 text-center">
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
    </div>
  )
}
