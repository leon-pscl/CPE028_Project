import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, AlertTriangle, CheckCircle, Zap, Wrench, Recycle, Lock } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { computeScore } from './scoring'
import type { DeviceFormData, AssessmentResult, MarketPriceQuote } from '@/types'

const ISSUES = [
  'Battery degradation',
  'Cracked screen',
  'Charging port issue',
  'Speaker problem',
  'Camera malfunction',
  'Software issue',
  'Overheating',
  'Motherboard failure',
  'Water/Liquid damage',
  'Storage failure',
  'Other',
]

const SEVERITIES = [
  { value: 'minor', label: 'Minor — Still usable, minor inconvenience' },
  { value: 'moderate', label: 'Moderate — Affects daily use' },
  { value: 'severe', label: 'Severe — Device barely functional' },
]

const INITIAL_FORM: DeviceFormData = {
  brand: '',
  model: '',
  ageMonths: 0,
  issue: '',
  severity: '',
}

export default function AssessPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [showAuthGate, setShowAuthGate] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      setShowAuthGate(false)
    }
  }, [authLoading, user])
  const [form, setForm] = useState<DeviceFormData>(INITIAL_FORM)
  const [screenFile, setScreenFile] = useState<File | null>(null)
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof DeviceFormData | 'screenFile', string>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const updateField = <K extends keyof DeviceFormData>(field: K, value: DeviceFormData[K]) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const updateFile = (files: FileList | null) => {
    setScreenFile(files?.[0] ?? null)
    setErrors(prev => ({ ...prev, screenFile: undefined }))
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof DeviceFormData | 'screenFile', string>> = {}
    if (!form.brand.trim()) newErrors.brand = 'Brand is required'
    if (!form.model.trim()) newErrors.model = 'Model is required'
    if (form.ageMonths < 1 || form.ageMonths > 300) newErrors.ageMonths = 'Enter a valid age (1–300 months)'
    if (!form.issue) newErrors.issue = 'Select an issue'
    if (!form.severity) newErrors.severity = 'Select a severity level'
    if (!screenFile) newErrors.screenFile = 'Attach a screen image to estimate price'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setShowAuthGate(true)
      return
    }
    if (!validate()) return

    const apiHost = import.meta.env.VITE_ML_SERVICE_URL ?? 'http://127.0.0.1:8000'
    const formData = new FormData()
    formData.append('brand', form.brand.trim())
    formData.append('model', form.model.trim())
    if (screenFile) {
      formData.append('file', screenFile)
    }

    setIsLoading(true)
    setApiError(null)

    try {
      const response = await fetch(`${apiHost}/predict`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const reply = await response.json().catch(() => null)
        throw new Error(reply?.detail ?? 'Prediction request failed')
      }

      const payload = await response.json()
      const assessmentResult = computeScore(form)
      setResult({
        ...assessmentResult,
        modelLabel: payload.label,
        modelProbability: payload.probability,
        marketPrices: payload.market_prices as MarketPriceQuote[],
      })
    } catch (error: unknown) {
      setApiError(error instanceof Error ? error.message : 'Unable to reach the prediction service.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSeeRoadmap = () => {
    navigate('/navigate', { state: { result, form } })
  }

  if (result) {
    return <AssessmentResultView result={result} form={form} onSeeRoadmap={handleSeeRoadmap} onRetake={() => setResult(null)} />
  }

  const notAuthed = !authLoading && !user

  return (
    <>
      {showAuthGate && <AuthGateModal onClose={() => setShowAuthGate(false)} />}

      <div className="page-container-sm">
        {notAuthed && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Sign in to assess your device and get repair guidance.</span>
            </div>
            <button
              onClick={() => setShowAuthGate(true)}
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              Sign in
            </button>
          </div>
        )}

        <div className="relative">
          <div className={notAuthed ? 'blur-sm' : ''}>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Assess Your Device</h1>
              <p className="mt-2 text-gray-600">Tell us about your device and upload a screen photo to get repair guidance and marketplace price estimates.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="assess-brand" className="label">Brand</label>
                  <input
                    id="assess-brand"
                    type="text"
                    placeholder="e.g. Samsung, Apple, Lenovo"
                    className={`input-field ${errors.brand ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    value={form.brand}
                    onChange={e => updateField('brand', e.target.value)}
                    aria-describedby={errors.brand ? 'err-brand' : undefined}
                    aria-invalid={!!errors.brand}
                  />
                  {errors.brand && <p id="err-brand" className="mt-1 text-xs text-red-600" role="alert">{errors.brand}</p>}
                </div>
                <div>
                  <label htmlFor="assess-model" className="label">Model</label>
                  <input
                    id="assess-model"
                    type="text"
                    placeholder="e.g. Galaxy A54, iPhone 14"
                    className={`input-field ${errors.model ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    value={form.model}
                    onChange={e => updateField('model', e.target.value)}
                    aria-describedby={errors.model ? 'err-model' : undefined}
                    aria-invalid={!!errors.model}
                  />
                  {errors.model && <p id="err-model" className="mt-1 text-xs text-red-600" role="alert">{errors.model}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="assess-screenImage" className="label">Screen photo</label>
                <input
                  id="assess-screenImage"
                  type="file"
                  accept="image/*"
                  className={`input-field ${errors.screenFile ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  onChange={e => updateFile(e.target.files)}
                  aria-describedby={errors.screenFile ? 'err-screenFile' : undefined}
                  aria-invalid={!!errors.screenFile}
                />
                {screenFile && <p className="mt-1 text-sm text-gray-600">Selected file: {screenFile.name}</p>}
                {errors.screenFile && <p id="err-screenFile" className="mt-1 text-xs text-red-600" role="alert">{errors.screenFile}</p>}
              </div>

              <div>
                <label htmlFor="assess-age" className="label">Device age (months)</label>
                <input
                  id="assess-age"
                  type="number"
                  min={1}
                  max={300}
                  placeholder="e.g. 24"
                  className={`input-field ${errors.ageMonths ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  value={form.ageMonths || ''}
                  onChange={e => updateField('ageMonths', parseInt(e.target.value) || 0)}
                  aria-describedby={errors.ageMonths ? 'err-ageMonths' : undefined}
                  aria-invalid={!!errors.ageMonths}
                />
                {errors.ageMonths && <p id="err-ageMonths" className="mt-1 text-xs text-red-600" role="alert">{errors.ageMonths}</p>}
              </div>

              <div>
                <label htmlFor="assess-issue" className="label">What's the issue?</label>
                <select
                  id="assess-issue"
                  className={`input-field ${errors.issue ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  value={form.issue}
                  onChange={e => updateField('issue', e.target.value)}
                  aria-describedby={errors.issue ? 'err-issue' : undefined}
                  aria-invalid={!!errors.issue}
                >
                  <option value="">Select an issue...</option>
                  {ISSUES.map(issue => (
                    <option key={issue} value={issue}>{issue}</option>
                  ))}
                </select>
                {errors.issue && <p id="err-issue" className="mt-1 text-xs text-red-600" role="alert">{errors.issue}</p>}
              </div>

              <div>
                <label className="label">How severe is the issue?</label>
                <div className="space-y-2">
                  {SEVERITIES.map(({ value, label }) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        form.severity === value
                          ? 'border-brand-300 bg-brand-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="severity"
                        value={value}
                        checked={form.severity === value}
                        onChange={e => updateField('severity', e.target.value)}
                        className="mt-0.5 h-4 w-4 text-brand-600 border-gray-300 focus:ring-brand-500"
                        aria-describedby={errors.severity ? 'err-severity' : undefined}
                        aria-invalid={!!errors.severity}
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
                {errors.severity && <p id="err-severity" className="mt-1 text-xs text-red-600" role="alert">{errors.severity}</p>}
              </div>

              {apiError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{apiError}</div>}

              <button type="submit" className="btn-primary w-full sm:w-auto" disabled={isLoading}>
                {isLoading ? 'Checking screen price…' : 'Calculate Score'}
                <Zap className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>

          {notAuthed && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl">
              <div className="rounded-xl bg-white/90 backdrop-blur-sm border border-gray-200 px-8 py-6 text-center shadow-lg max-w-sm">
                <Lock className="mx-auto h-8 w-8 text-gray-400 mb-3" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-700">Sign in to assess your device</p>
                <p className="mt-1 text-xs text-gray-500">Get a personalized repair-or-recycle score with cost estimates.</p>
                <button
                  onClick={() => setShowAuthGate(true)}
                  className="mt-4 rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                >
                  Sign in
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
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
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
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
      aria-labelledby="authgate-title"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div ref={dialogRef} className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <Lock className="h-7 w-7 text-brand-600" aria-hidden="true" />
        </div>
        <h2 id="authgate-title" className="text-xl font-bold text-gray-900">Sign in to continue</h2>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          Get a personalized repair-or-recycle recommendation for your device. Sign in or create a free account.
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
        </div>
      </div>
    </div>
  )
}

function AssessmentResultView({
  result,
  form,
  onSeeRoadmap,
  onRetake,
}: {
  result: AssessmentResult
  form: DeviceFormData
  onSeeRoadmap: () => void
  onRetake: () => void
}) {
  const isRepair = result.direction === 'REPAIR'

  return (
    <div className="page-container-sm" aria-live="polite">
      <div className={`card text-center ${isRepair ? 'border-brand-200' : 'border-recycle-200'}`}>
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isRepair ? 'bg-brand-100 text-brand-600' : 'bg-recycle-100 text-recycle-600'}`}>
          {isRepair ? <Wrench className="h-8 w-8" aria-hidden="true" /> : <Recycle className="h-8 w-8" aria-hidden="true" />}
        </div>

        <h2 className="text-2xl font-bold text-gray-900">
          {isRepair ? 'Recommended: Repair' : 'Recommended: Recycle'}
        </h2>

        <div className="mt-6">
          <div className="relative mx-auto h-4 w-48 rounded-full bg-gray-200" role="progressbar" aria-valuenow={result.score} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`absolute left-0 top-0 h-4 rounded-full transition-all ${isRepair ? 'bg-brand-500' : 'bg-recycle-500'}`}
              style={{ width: `${result.score}%` }}
            />
          </div>
          <div className="mt-2 text-4xl font-extrabold text-gray-900">{result.score}<span className="text-lg font-medium text-gray-500">/100</span></div>
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            <CheckCircle className="h-3 w-3" aria-hidden="true" />
            Confidence: {result.confidence}
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-600">{result.rationale}</p>

        {result.modelLabel && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-800">
            <p className="text-sm font-semibold text-slate-900">Screen image analysis</p>
            <p className="mt-2">Detected screen condition: <span className="font-semibold">{result.modelLabel}</span></p>
            <p>Confidence: {((result.modelProbability ?? 0) * 100).toFixed(1)}%</p>
          </div>
        )}

        {result.costEstimate && (
          <div className={`mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${isRepair ? 'bg-brand-50 text-brand-700' : 'bg-recycle-50 text-recycle-700'}`}>
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Estimated repair cost: ₱{result.costEstimate.min.toLocaleString()} – ₱{result.costEstimate.max.toLocaleString()}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={onSeeRoadmap} className={`btn-primary ${isRepair ? '' : 'btn-recycle'}`}>
            See My Roadmap
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button onClick={onRetake} className="btn-secondary">
            Retake Assessment
          </button>
        </div>
      </div>

      {result.marketPrices?.length ? (
        <div className="mt-6 card">
          <h3 className="text-sm font-semibold text-gray-900">Marketplace price estimates</h3>
          <ul className="mt-3 space-y-3">
            {result.marketPrices.map((quote, index) => (
              <li key={`${quote.source}-${index}`} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-4 text-sm font-medium text-gray-900">
                  <span>{quote.source}</span>
                  <span>₱{quote.price.toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{quote.title}</p>
                <a href={quote.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
                  View listing
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 card">
        <h3 className="text-sm font-semibold text-gray-900">Your device details</h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><span className="text-gray-500">Brand:</span> <span className="font-medium text-gray-900">{form.brand}</span></div>
          <div><span className="text-gray-500">Model:</span> <span className="font-medium text-gray-900">{form.model}</span></div>
          <div><span className="text-gray-500">Age:</span> <span className="font-medium text-gray-900">{form.ageMonths} months</span></div>
          <div><span className="text-gray-500">Issue:</span> <span className="font-medium text-gray-900">{form.issue}</span></div>
          <div className="sm:col-span-2"><span className="text-gray-500">Severity:</span> <span className="font-medium text-gray-900">{form.severity}</span></div>
        </dl>
      </div>
    </div>
  )
}
