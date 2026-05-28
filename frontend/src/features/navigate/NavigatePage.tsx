import { useState, useEffect } from 'react'
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <Lock className="h-7 w-7 text-brand-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Sign in to continue</h2>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          Your repair and recycle roadmap is saved to your account. Sign in or create a free account to access it.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/auth/login"
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/auth/register"
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Create account
          </Link>
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
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

  return (
    <div className={`flex items-center ${isLeft ? 'flex-row' : 'flex-row-reverse'} gap-3`}>
      <div className={`w-16 shrink-0 ${isLeft ? '' : 'hidden sm:block'}`} />
      <div
        onClick={() => onToggle(item.id)}
        className={`group relative flex w-full max-w-[220px] cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-left transition-all hover:shadow-md ${
          item.completed
            ? 'border-brand-300 bg-brand-50'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(item.id) }}
          className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
            item.completed
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-gray-300 group-hover:border-brand-400'
          }`}
          aria-label={`Mark "${item.title}" as ${item.completed ? 'incomplete' : 'complete'}`}
        >
          {item.completed && <CheckCircle2 className="h-3.5 w-3.5" />}
        </button>
        <div className="min-w-0">
          <p className={`text-sm font-medium leading-tight ${item.completed ? 'text-brand-800' : 'text-gray-800'}`}>
            {item.title}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 leading-snug">{item.description}</p>
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

  return (
    <div className="relative">
      {index > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-8 w-0.5 h-8 bg-gray-200" />
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
              <div className="w-0.5 h-6 bg-gray-200" />
              <div className="relative w-full h-0.5">
                <div className="absolute left-0 right-0 top-0 h-0.5 bg-gray-200" />
              </div>
              <div className="w-0.5 h-6 bg-gray-200" />
            </div>
            <div className="flex flex-col items-start gap-3 pl-4">
              {rightItems.map(item => (
                <div key={item.id} className="w-full flex justify-start">
                  <SubNode item={item} onToggle={onToggle} />
                </div>
              ))}
            </div>
          </div>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
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
          <span className="text-xs font-semibold text-gray-400">{index + 1}</span>
        </div>
        <div
          onClick={() => onToggle(step.id)}
          className={`group relative flex-1 cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-lg ${
            step.completed
              ? 'border-brand-400 bg-brand-50'
              : isRecommended
                ? 'border-amber-400 bg-amber-50 shadow-amber-100'
                : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(step.id) }}
              className={`mt-0.5 h-7 w-7 shrink-0 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                step.completed
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : isRecommended
                    ? 'border-amber-400 bg-amber-100 text-amber-600'
                    : 'border-gray-300 text-gray-400 group-hover:border-brand-400'
              }`}
              aria-label={`Mark "${step.title}" as ${step.completed ? 'incomplete' : 'complete'}`}
            >
              {step.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center justify-center rounded-md p-1 ${
                  step.completed ? 'bg-brand-200 text-brand-700' : isRecommended ? 'bg-amber-200 text-amber-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <h3 className={`font-semibold text-base ${
                  step.completed ? 'text-brand-800' : isRecommended ? 'text-amber-900' : 'text-gray-900'
                }`}>
                  {step.title}
                </h3>
              </div>
              <p className={`mt-1 text-sm ${
                step.completed ? 'text-brand-700' : isRecommended ? 'text-amber-800' : 'text-gray-600'
              }`}>
                {step.description}
              </p>
              {step.type === 'referral' && index === total - 1 && (
                <Link
                  to="/connect"
                  state={{ direction }}
                  className="btn-primary mt-3 inline-flex items-center gap-2"
                >
                  Find a {direction === 'REPAIR' ? 'repair shop' : 'drop-off point'}
                  <MapPin className="h-4 w-4" />
                </Link>
              )}
            </div>
            {hasSubItems && (
              <div className="hidden sm:flex flex-col items-center gap-1 text-gray-300">
                <ArrowRight className="h-4 w-4" />
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
    if (!authLoading && !user) {
      setShowAuthGate(true)
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

  return (
    <>
      {showAuthGate && <AuthGateModal onClose={() => setShowAuthGate(false)} />}

      <div className={`mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 ${showAuthGate ? 'pointer-events-none select-none' : ''}`}>

        {!authLoading && !user && !showAuthGate && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <Lock className="h-4 w-4 shrink-0" />
              <span>Sign in to save your progress and interact with the roadmap.</span>
            </div>
            <button
              onClick={() => setShowAuthGate(true)}
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              Sign in
            </button>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Your Roadmap</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${direction === 'REPAIR' ? 'bg-brand-100 text-brand-700' : 'bg-recycle-100 text-recycle-700'}`}>
              {direction}
            </span>
          </div>
          <p className="mt-1 text-gray-600">Follow these steps to responsibly handle {deviceName}.</p>
        </div>

        <div className="mb-8 card">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Progress</span>
            <span className="text-gray-500">{completedCount} of {totalCount} steps</span>
          </div>
          <div className="mt-2 h-2.5 w-full rounded-full bg-gray-200">
            <div
              className={`h-2.5 rounded-full transition-all ${direction === 'REPAIR' ? 'bg-brand-500' : 'bg-recycle-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {isComplete && (
            <div className="mt-3 flex items-center gap-2 text-sm font-medium text-brand-600">
              <CheckCircle2 className="h-4 w-4" />
              All steps completed!
            </div>
          )}
        </div>

        {direction === 'RECYCLE' && (
          <div className="mb-8 flex items-start gap-3 rounded-lg border border-recycle-200 bg-recycle-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-recycle-600" />
            <div>
              <p className="text-sm font-medium text-recycle-800">Data wipe is mandatory</p>
              <p className="mt-1 text-sm text-recycle-700">Before recycling, make sure all personal data is permanently erased from your device.</p>
            </div>
          </div>
        )}

        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gray-100 hidden sm:block" />
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
            <p className="text-sm text-gray-500">
              No assessment found.{' '}
              <button onClick={() => navigate('/assess')} className="font-medium text-brand-600 hover:text-brand-700 cursor-pointer">
                Take an assessment first
              </button>
            </p>
          </div>
        )}
      </div>
    </>
  )
}
