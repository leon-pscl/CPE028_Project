import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, AlertTriangle, CheckCircle, Zap, Wrench, Recycle } from 'lucide-react'
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

  return (
    <div className="min-h-screen bg-section-assess">
      <div className="page-container-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Assess Your Device</h1>
          <p className="mt-2 text-muted">Tell us about your device and upload a screen photo to get repair guidance and marketplace price estimates.</p>
        </div>

        <div className="rounded-2xl bg-surface p-6 shadow-sm sm:p-8">
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
              {screenFile && <p className="mt-1 text-sm text-muted">Selected file: {screenFile.name}</p>}
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
                        ? 'border-purple bg-purple/30'
                        : 'border-divider hover:bg-canvas'
                    }`}
                  >
                    <input
                      type="radio"
                      name="severity"
                      value={value}
                      checked={form.severity === value}
                      onChange={e => updateField('severity', e.target.value)}
                      className="mt-0.5 h-4 w-4 text-ink border-divider focus:ring-ink"
                      aria-describedby={errors.severity ? 'err-severity' : undefined}
                      aria-invalid={!!errors.severity}
                    />
                    <span className="text-sm text-ink">{label}</span>
                  </label>
                ))}
              </div>
              {errors.severity && <p id="err-severity" className="mt-1 text-xs text-red-600" role="alert">{errors.severity}</p>}
            </div>

            {apiError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{apiError}</div>}

            <button type="submit" className="btn-purple w-full sm:w-auto" disabled={isLoading}>
              {isLoading ? 'Checking screen price…' : 'Calculate Score'}
              <Zap className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
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
    <div className="min-h-screen" style={{ backgroundColor: isRepair ? 'rgb(var(--color-section-hero))' : 'rgb(var(--color-section-roadmap))' }}>
      <div className="page-container-sm" aria-live="polite">
        <div className="rounded-2xl bg-surface p-6 shadow-sm text-center sm:p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple/30">
            {isRepair ? <Wrench className="h-8 w-8 text-ink" aria-hidden="true" /> : <Recycle className="h-8 w-8 text-ink" aria-hidden="true" />}
          </div>

          <h2 className="text-2xl font-bold text-ink">
            {isRepair ? 'Recommended: Repair' : 'Recommended: Recycle'}
          </h2>

          <div className="mt-6">
            <div className="relative mx-auto h-4 w-full max-w-xs rounded-full bg-divider" role="progressbar" aria-valuenow={result.score} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="absolute left-0 top-0 h-4 rounded-full transition-all bg-ink"
                style={{ width: `${result.score}%` }}
              />
            </div>
            <div className="mt-2 text-4xl font-extrabold text-ink">{result.score}<span className="text-lg font-medium text-muted">/100</span></div>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-canvas px-3 py-1 text-xs font-medium text-muted">
              <CheckCircle className="h-3 w-3" aria-hidden="true" />
              Confidence: {result.confidence}
            </div>
          </div>

          <p className="mt-4 text-sm text-muted">{result.rationale}</p>

          {result.modelLabel && (
            <div className="mt-4 rounded-2xl border border-divider bg-surface p-4 text-left text-sm text-ink">
              <p className="text-sm font-semibold text-ink">Screen image analysis</p>
              <p className="mt-2">Detected screen condition: <span className="font-semibold">{result.modelLabel}</span></p>
              <p>Confidence: {((result.modelProbability ?? 0) * 100).toFixed(1)}%</p>
            </div>
          )}

          {result.costEstimate && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm bg-purple/30 text-ink">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Estimated repair cost: ₱{result.costEstimate.min.toLocaleString()} – ₱{result.costEstimate.max.toLocaleString()}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button onClick={onSeeRoadmap} className="btn-purple">
              See My Roadmap
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button onClick={onRetake} className="btn-surface">
              Retake Assessment
            </button>
          </div>
        </div>

        {result.marketPrices?.length ? (
          <div className="mt-6 rounded-2xl bg-surface p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-ink">Marketplace price estimates</h3>
            <ul className="mt-3 space-y-3">
              {result.marketPrices.map((quote, index) => (
                <li key={`${quote.source}-${index}`} className="rounded-xl border border-divider p-4">
                  <div className="flex items-center justify-between gap-4 text-sm font-medium text-ink">
                    <span>{quote.source}</span>
                    <span>₱{quote.price.toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{quote.title}</p>
                  <a href={quote.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-ink hover:opacity-70">
                    View listing
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl bg-surface p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-ink">Your device details</h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div><span className="text-muted">Brand:</span> <span className="font-medium text-ink">{form.brand}</span></div>
            <div><span className="text-muted">Model:</span> <span className="font-medium text-ink">{form.model}</span></div>
            <div><span className="text-muted">Age:</span> <span className="font-medium text-ink">{form.ageMonths} months</span></div>
            <div><span className="text-muted">Issue:</span> <span className="font-medium text-ink">{form.issue}</span></div>
            <div className="sm:col-span-2"><span className="text-muted">Severity:</span> <span className="font-medium text-ink">{form.severity}</span></div>
          </dl>
        </div>
      </div>
    </div>
  )
}
