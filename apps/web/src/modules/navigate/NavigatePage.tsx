import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, ArrowRight, Info, Download, ExternalLink, MapPin, AlertCircle } from 'lucide-react'
import { getRoadmapSteps } from './roadmapData'
import type { RoadmapStep, AssessmentResult, AssessmentDirection } from '@/types'

const STEP_TYPE_ICONS = {
  action: CheckCircle2,
  info: Info,
  download: Download,
  referral: ExternalLink,
}

const STEP_TYPE_COLORS = {
  action: 'text-brand-600 bg-brand-100',
  info: 'text-blue-600 bg-blue-100',
  download: 'text-purple-600 bg-purple-100',
  referral: 'text-recycle-600 bg-recycle-100',
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
    setSteps(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s))
  }

  const completedCount = steps.filter(s => s.completed).length
  const progress = Math.round((completedCount / steps.length) * 100)
  const isComplete = completedCount === steps.length

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Your Roadmap</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${direction === 'REPAIR' ? 'bg-brand-100 text-brand-700' : 'bg-recycle-100 text-recycle-700'}`}>
            {direction}
          </span>
        </div>
        <p className="mt-1 text-gray-600">Follow these steps to responsibly handle {deviceName}.</p>
      </div>

      {/* Progress bar */}
      <div className="mb-8 card">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Progress</span>
          <span className="text-gray-500">{completedCount} of {steps.length} steps</span>
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
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-recycle-200 bg-recycle-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-recycle-600" />
          <div>
            <p className="text-sm font-medium text-recycle-800">Data wipe is mandatory</p>
            <p className="mt-1 text-sm text-recycle-700">Before recycling, make sure all personal data is permanently erased from your device.</p>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = STEP_TYPE_ICONS[step.type]
          const colorClass = STEP_TYPE_COLORS[step.type]
          const isLast = index === steps.length - 1

          return (
            <div
              key={step.id}
              className={`card transition-all ${step.completed ? 'border-brand-200 bg-brand-50/50' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => toggleStep(step.id)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer ${
                      step.completed
                        ? 'bg-brand-600 text-white'
                        : 'border-2 border-gray-300 text-gray-400 hover:border-brand-400'
                    }`}
                    aria-label={`Mark "${step.title}" as ${step.completed ? 'incomplete' : 'complete'}`}
                  >
                    {step.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </button>
                  {!isLast && (
                    <div className={`mt-1 h-8 w-0.5 ${step.completed ? 'bg-brand-300' : 'bg-gray-200'}`} />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center rounded p-1 ${colorClass}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <h3 className={`font-semibold ${step.completed ? 'text-brand-800' : 'text-gray-900'}`}>
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{step.description}</p>

                  {step.type === 'referral' && isLast && (
                    <Link
                      to="/connect"
                      state={{ direction, deviceName: state?.form?.brand }}
                      className="btn-primary mt-3"
                    >
                      Find a {direction === 'REPAIR' ? 'repair shop' : 'drop-off point'}
                      <MapPin className="h-4 w-4" />
                    </Link>
                  )}
                </div>

                <span className="text-xs font-medium text-gray-400">Step {index + 1}</span>
              </div>
            </div>
          )
        })}
      </div>

      {!state?.result && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            No assessment found.{' '}
            <button onClick={() => navigate('/assess')} className="font-medium text-brand-600 hover:text-brand-700 cursor-pointer">
              Take an assessment first
            </button>
          </p>
        </div>
      )}
    </div>
  )
}
