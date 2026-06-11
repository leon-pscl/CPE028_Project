import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, ChevronDown, ChevronUp, Cpu, ShieldCheck } from 'lucide-react'
import { WrenchScrewdriverIcon, TruckIcon } from '@heroicons/react/24/outline'
import { useMlAssessment } from '@/hooks/useMlAssessment'
import { useAuth } from '@/hooks/useAuth'
import { saveAssessment } from '@/lib/assessmentStore'
import { db } from '@/lib/database'
import type { DeviceFormData, AssessmentResult } from '@/types'

const INITIAL_FORM: DeviceFormData = {
  brand: '',
  model: '',
  ageMonths: 0,
  damageDescription: '',
}

export default function AssessPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { assessWithFallback } = useMlAssessment()
  const [form, setForm] = useState<DeviceFormData>(INITIAL_FORM)
  const [screenFile, setScreenFile] = useState<File | null>(null)
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [usedMl, setUsedMl] = useState(false)
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
    if (!form.damageDescription.trim()) newErrors.damageDescription = 'Please describe the damage'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    setApiError(null)

    try {
      const { result: assessmentResult, usedMl: ml } = await assessWithFallback(form, screenFile)

      // Merge ML-detected issue/severity into form for filter engine
      const enrichedForm: DeviceFormData = {
        ...form,
        issue: assessmentResult.issue ?? form.issue,
        severity: assessmentResult.severity ?? form.severity,
      }

      // Save to sessionStorage (fast cache) with a shared UUID
      const assessmentId = saveAssessment(assessmentResult, enrichedForm)
      assessmentResult.id = assessmentId

      // Persist to Supabase if logged in — use the same UUID
      if (user) {
        try {
          await db.assessmentResults.create({
            id: assessmentId,
            user_id: user.id,
            result_json: assessmentResult as unknown as Record<string, unknown>,
            form_json: enrichedForm as unknown as Record<string, unknown>,
          })
        } catch {
          // DB save is best-effort — sessionStorage fallback is sufficient
        }
      }

      setResult(assessmentResult)
      setForm(enrichedForm)
      setUsedMl(ml)
    } catch (error: unknown) {
      setApiError(error instanceof Error ? error.message : 'Unable to reach the assessment service.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSeeRoadmap = () => {
    if (result?.id) {
      navigate(`/navigate/${result.id}`)
    }
  }

  const handleFindShop = () => {
    navigate('/connect')
  }

  if (result) {
    return (
      <AssessmentResultView
        result={result}
        form={form}
        usedMl={usedMl}
        onSeeRoadmap={handleSeeRoadmap}
        onFindShop={handleFindShop}
        onRetake={() => setResult(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-section-assess">
      <div className="page-container-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Assessment</h1>
          <p className="mt-2 text-muted">Tell us about your device. We will help you determine what can be done with it.</p>
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
              <label htmlFor="assess-damage" className="label">Describe the damage</label>
              <textarea
                id="assess-damage"
                rows={4}
                placeholder="e.g. Phone fell screen-down on tile floor, glass cracked across the display"
                className={`input-field resize-none ${errors.damageDescription ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                value={form.damageDescription}
                onChange={e => updateField('damageDescription', e.target.value)}
                aria-describedby={errors.damageDescription ? 'err-damageDescription' : undefined}
                aria-invalid={!!errors.damageDescription}
              />
              {errors.damageDescription && <p id="err-damageDescription" className="mt-1 text-xs text-red-600" role="alert">{errors.damageDescription}</p>}
            </div>

            <div>
              <label htmlFor="assess-screenImage" className="label">Screen photo <span className="text-muted">(optional)</span></label>
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

            {apiError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{apiError}</div>}

            <button type="submit" className="btn-purple w-full sm:w-auto" disabled={isLoading}>
              {isLoading ? 'Analyzing...' : 'Get Assessment'}
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
  usedMl,
  onSeeRoadmap,
  onFindShop,
  onRetake,
}: {
  result: AssessmentResult
  form: DeviceFormData
  usedMl: boolean
  onSeeRoadmap: () => void
  onFindShop: () => void
  onRetake: () => void
}) {
  const isRepair = result.direction === 'REPAIR'
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <div className="min-h-screen" style={{ backgroundColor: isRepair ? 'rgb(var(--color-section-roadmap))' : 'rgb(var(--color-section-connect))' }}>
      <div className="page-container-sm" aria-live="polite">
        <div className="rounded-2xl bg-surface p-6 shadow-sm text-center sm:p-8">
          <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center text-ink">
            {isRepair
              ? <WrenchScrewdriverIcon className="h-28 w-28" strokeWidth={1.5} />
              : <TruckIcon className="h-28 w-28" strokeWidth={1.5} />}
          </div>

          <h2 className="text-2xl font-bold text-ink sm:text-3xl">
            {isRepair ? 'Your device is still repairable.' : 'Your device can still be recycled.'}
          </h2>

          <p className="mt-3 text-muted">
            {isRepair
              ? 'The diagnosed problem is hardware-related. Bring the device to a professional for repairs.'
              : 'Even after its demise, it still has purpose.'}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {isRepair && (
              <button onClick={onSeeRoadmap} className="rounded-full border border-ink bg-surface px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-divider cursor-pointer">
                Go to Repair Roadmap
              </button>
            )}
            <button onClick={onFindShop} className="rounded-full border border-ink bg-purple px-6 py-3 text-sm font-semibold text-ink transition-colors hover:opacity-90 cursor-pointer">
              {isRepair ? 'Find a Repair Shop' : 'Find a Recycling Center'}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-surface shadow-sm">
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="flex w-full items-center justify-center gap-2 px-6 py-4 text-sm font-semibold text-ink transition-colors hover:bg-canvas cursor-pointer"
          >
            Assessment Details
            {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {detailsOpen && (
            <div className="border-t border-divider px-6 pb-6 pt-4 space-y-5">
              {usedMl && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                  <Cpu className="h-3 w-3" aria-hidden="true" />
                  ML-powered assessment
                </div>
              )}

              {/* iFixit Repairability Score */}
              {result.mlRepairability && (
                <div className="rounded-xl border border-divider p-4 text-left text-sm text-ink">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">iFixit Repairability Score</p>
                    <span className="text-xs text-subtle">Predicted</span>
                  </div>
                  <div className="mt-3 flex items-end gap-3">
                    <span className="text-4xl font-bold text-ink">{result.mlRepairability.score.toFixed(1)}</span>
                    <span className="text-lg text-muted mb-1">/10</span>
                  </div>
                  <div className="mt-2 relative h-2.5 w-full rounded-full bg-divider">
                    <div
                      className={`absolute left-0 top-0 h-2.5 rounded-full transition-all ${
                        result.mlRepairability.score >= 6 ? 'bg-green-500'
                          : result.mlRepairability.score >= 4 ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${(result.mlRepairability.score / 10) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-xs text-subtle">
                    <span>1 — Not repairable</span>
                    <span>10 — Easily repairable</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {result.mlRepairability.isRepairable
                      ? <span className="inline-flex items-center gap-1 text-green-700 font-medium"><ShieldCheck className="h-4 w-4" /> Repairable</span>
                      : <span className="text-red-600 font-medium">Not recommended for repair</span>
                    }
                  </div>
                  <p className="mt-2 text-muted">{result.mlRepairability.recommendation}</p>
                  <p className="mt-2 text-xs text-subtle">
                    Score thresholds: ≥8.0 = highly repairable (parts readily available),
                    ≥6.0 = moderately repairable, ≥4.0 = difficult, {'<'}4.0 = not recommended.
                    Predicted by a model trained on <span className="font-medium">19,746 device records</span> including
                    iFixit repairability scores, repair history, and gadget failure datasets.
                  </p>
                </div>
              )}

              {/* Repair Complexity */}
              {result.mlDamage && result.mlRepairability && (
                <div className="rounded-xl border border-divider p-4 text-left text-sm text-ink">
                  <p className="font-semibold">Repair complexity</p>
                  <div className="mt-2">
                    {(() => {
                      const score = result.mlRepairability.score
                      const label = result.mlDamage.predictedLabel
                      let complexity: string
                      let color: string
                      let explanation: string

                      if (score >= 8) {
                        complexity = 'Low'
                        color = 'bg-green-50 text-green-700'
                        explanation = 'Common issue with widely available parts and documented repair guides.'
                      } else if (score >= 6) {
                        complexity = 'Medium'
                        color = 'bg-yellow-50 text-yellow-700'
                        explanation = 'Repairable, but some parts may need to be sourced from specialty suppliers.'
                      } else if (score >= 4) {
                        complexity = 'High'
                        color = 'bg-orange-50 text-orange-700'
                        explanation = 'Parts are scarce or expensive. Professional repair recommended.'
                      } else {
                        complexity = 'Very High'
                        color = 'bg-red-50 text-red-700'
                        explanation = 'Repair is not cost-effective. Consider recycling or replacement.'
                      }

                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${color}`}>
                              {complexity}
                            </span>
                            <span className="text-muted">— {label}</span>
                          </div>
                          <p className="mt-2 text-muted">{explanation}</p>
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* Damage Classification */}
              {result.mlDamage && (
                <div className="rounded-xl border border-divider p-4 text-left text-sm text-ink">
                  <p className="font-semibold">Damage classification</p>
                  <p className="mt-2 text-muted">
                    Based on your description, the model identified the issue as:
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-purple/30 px-3 py-1 text-sm font-semibold text-ink">
                      {result.mlDamage.predictedLabel}
                    </span>
                    <span className="text-muted">
                      ({(result.mlDamage.confidence * 100).toFixed(1)}% confidence)
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-subtle">
                    Your description: "{result.mlDamage.input}"
                  </p>
                </div>
              )}

              {/* Screen Image Analysis */}
              {result.modelLabel && (
                <div className="rounded-xl border border-divider p-4 text-left text-sm text-ink">
                  <p className="font-semibold">Screen image analysis</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${result.modelLabel === 'good' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {result.modelLabel === 'good' ? 'Screen looks intact' : 'Screen damage detected'}
                    </span>
                    <span className="text-muted">
                      ({((result.modelProbability ?? 0) * 100).toFixed(1)}% confidence)
                    </span>
                  </div>
                </div>
              )}

              {/* Parts Prices */}
              {result.marketPrices && result.marketPrices.length > 0 && (
                <div className="rounded-xl border border-divider p-4 text-left text-sm text-ink">
                  <p className="font-semibold">Replacement parts prices</p>
                  <p className="mt-1 text-muted">
                    Live prices from Shopee and Lazada for "{form.brand} {form.model} screen replacement":
                  </p>
                  <ul className="mt-3 space-y-2">
                    {result.marketPrices.map((quote, index) => (
                      <li key={`${quote.source}-${index}`} className="flex items-center justify-between rounded-lg bg-canvas p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 text-xs font-medium text-muted">{quote.source}</span>
                            <span className="truncate text-xs text-muted">{quote.title}</span>
                          </div>
                        </div>
                        <div className="ml-3 flex items-center gap-2">
                          <span className="whitespace-nowrap font-semibold text-ink">₱{quote.price.toLocaleString()}</span>
                          <a href={quote.url} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-ink hover:opacity-70">
                            View →
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {result.marketPrices.length > 1 && (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-purple/20 px-3 py-2 text-xs">
                      <span className="text-muted">Price range</span>
                      <span className="font-medium text-ink">
                        ₱{Math.min(...result.marketPrices.map(p => p.price)).toLocaleString()} – ₱{Math.max(...result.marketPrices.map(p => p.price)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Cost Breakdown */}
              {result.mlCostAnalysis && result.mlCostAnalysis.estimatedRepairCost > 0 && (
                <div className="rounded-xl border border-divider p-4 text-left text-sm text-ink">
                  <p className="font-semibold">Estimated repair cost</p>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Replacement parts (market avg.)</span>
                      <span className="font-medium">₱{result.mlCostAnalysis.partsCost.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Labor / service fee</span>
                      <span className="font-medium">₱{result.mlCostAnalysis.laborCost.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-divider pt-2 flex items-center justify-between">
                      <span className="font-semibold">Estimated total</span>
                      <span className="font-bold text-ink">₱{result.mlCostAnalysis.estimatedRepairCost.toLocaleString()}</span>
                    </div>
                  </div>

                  {result.mlCostAnalysis.deviceValue > 0 && (
                    <div className="mt-3 rounded-lg bg-canvas p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted">Repair cost vs. device value</span>
                        <span className="font-medium">{(result.mlCostAnalysis.repairRatio * 100).toFixed(0)}%</span>
                      </div>
                      <div className="mt-1 relative h-1.5 w-full rounded-full bg-divider">
                        <div
                          className={`absolute left-0 top-0 h-1.5 rounded-full ${
                            result.mlCostAnalysis.repairRatio > 0.7 ? 'bg-red-500'
                              : result.mlCostAnalysis.repairRatio > 0.5 ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(result.mlCostAnalysis.repairRatio * 100, 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        Device value: ₱{result.mlCostAnalysis.deviceValue.toLocaleString()}
                      </p>
                    </div>
                  )}

                  <p className="mt-3 text-muted">{result.mlCostAnalysis.recommendation}</p>
                </div>
              )}

              {result.costEstimate && !result.mlCostAnalysis && (
                <div className="rounded-xl border border-divider p-4 text-left text-sm text-ink">
                  <p className="font-semibold">Estimated repair cost</p>
                  <p className="mt-1 text-muted">
                    ₱{result.costEstimate.min.toLocaleString()} – ₱{result.costEstimate.max.toLocaleString()}
                  </p>
                  <p className="mt-2 text-xs text-subtle">
                    Estimate based on device age, issue type, and typical repair costs for {form.brand} devices.
                  </p>
                </div>
              )}

              {/* Device Details */}
              <div className="rounded-xl border border-divider p-4 text-left text-sm text-ink">
                <p className="font-semibold">Device details</p>
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div><span className="text-muted">Brand:</span> <span className="font-medium">{form.brand}</span></div>
                  <div><span className="text-muted">Model:</span> <span className="font-medium">{form.model}</span></div>
                  <div><span className="text-muted">Age:</span> <span className="font-medium">{form.ageMonths} months</span></div>
                  <div className="sm:col-span-2"><span className="text-muted">Damage:</span> <span className="font-medium">{form.damageDescription}</span></div>
                </dl>
              </div>

              <button onClick={onRetake} className="btn-surface w-full">
                Retake Assessment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
