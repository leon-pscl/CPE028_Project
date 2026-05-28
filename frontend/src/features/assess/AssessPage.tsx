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
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Assess Your Device</h1>
        <p className="mt-2 text-gray-600">Tell us about your device and upload a screen photo to get repair guidance and marketplace price estimates.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="brand" className="label">Brand</label>
            <input
              id="brand"
              type="text"
              placeholder="e.g. Samsung, Apple, Lenovo"
              className={`input-field ${errors.brand ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              value={form.brand}
              onChange={e => updateField('brand', e.target.value)}
            />
            {errors.brand && <p className="mt-1 text-xs text-red-600">{errors.brand}</p>}
          </div>
          <div>
            <label htmlFor="model" className="label">Model</label>
            <input
              id="model"
              type="text"
              placeholder="e.g. Galaxy A54, iPhone 14"
              className={`input-field ${errors.model ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              value={form.model}
              onChange={e => updateField('model', e.target.value)}
            />
            {errors.model && <p className="mt-1 text-xs text-red-600">{errors.model}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="screenImage" className="label">Screen photo</label>
          <input
            id="screenImage"
            type="file"
            accept="image/*"
            className={`input-field ${errors.screenFile ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
            onChange={e => updateFile(e.target.files)}
          />
          {screenFile && <p className="mt-1 text-sm text-gray-600">Selected file: {screenFile.name}</p>}
          {errors.screenFile && <p className="mt-1 text-xs text-red-600">{errors.screenFile}</p>}
        </div>

        <div>
          <label htmlFor="age" className="label">Device age (months)</label>
          <input
            id="age"
            type="number"
            min={1}
            max={300}
            placeholder="e.g. 24"
            className={`input-field ${errors.ageMonths ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
            value={form.ageMonths || ''}
            onChange={e => updateField('ageMonths', parseInt(e.target.value) || 0)}
          />
          {errors.ageMonths && <p className="mt-1 text-xs text-red-600">{errors.ageMonths}</p>}
        </div>

        <div>
          <label htmlFor="issue" className="label">What's the issue?</label>
          <select
            id="issue"
            className={`input-field ${errors.issue ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
            value={form.issue}
            onChange={e => updateField('issue', e.target.value)}
          >
            <option value="">Select an issue...</option>
            {ISSUES.map(issue => (
              <option key={issue} value={issue}>{issue}</option>
            ))}
          </select>
          {errors.issue && <p className="mt-1 text-xs text-red-600">{errors.issue}</p>}
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
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
          {errors.severity && <p className="mt-1 text-xs text-red-600">{errors.severity}</p>}
        </div>

        {apiError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{apiError}</div>}

        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={isLoading}>
          {isLoading ? 'Checking screen price…' : 'Calculate Score'}
          <Zap className="h-4 w-4" />
        </button>
      </form>
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
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className={`card text-center ${isRepair ? 'border-brand-200' : 'border-recycle-200'}`}>
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isRepair ? 'bg-brand-100 text-brand-600' : 'bg-recycle-100 text-recycle-600'}`}>
          {isRepair ? <Wrench className="h-8 w-8" /> : <Recycle className="h-8 w-8" />}
        </div>

        <h2 className="text-2xl font-bold text-gray-900">
          {isRepair ? 'Recommended: Repair' : 'Recommended: Recycle'}
        </h2>

        <div className="mt-6">
          <div className="relative mx-auto h-4 w-48 rounded-full bg-gray-200">
            <div
              className={`absolute left-0 top-0 h-4 rounded-full transition-all ${isRepair ? 'bg-brand-500' : 'bg-recycle-500'}`}
              style={{ width: `${result.score}%` }}
            />
          </div>
          <div className="mt-2 text-4xl font-extrabold text-gray-900">{result.score}<span className="text-lg font-medium text-gray-500">/100</span></div>
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            <CheckCircle className="h-3 w-3" />
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
            <AlertTriangle className="h-4 w-4" />
            Estimated repair cost: ₱{result.costEstimate.min.toLocaleString()} – ₱{result.costEstimate.max.toLocaleString()}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={onSeeRoadmap} className={`btn-primary ${isRepair ? '' : 'btn-recycle'}`}>
            See My Roadmap
            <ArrowRight className="h-4 w-4" />
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
