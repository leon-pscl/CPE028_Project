/**
 * NavigatePage.tsx
 * ----------------
 * Converts the AssessPage result + form data into a filtered, interactive
 * roadmap.  The filter engine (roadmapFilter.ts) stamps every step with a
 * status (priority | recommended | info | unsafe | skipped | default) so
 * the UI can colour-code and dim irrelevant steps.
 *
 * Design: matches the existing Rev.Tech component style (Tailwind tokens,
 * DM Sans, ink/muted/divider palette, border-ink cards) while adding the
 * richer timeline/sub-step UX from the standalone HTML prototype.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  CheckCircle2, Circle, MapPin, AlertCircle, ChevronDown, ChevronUp,
  ExternalLink, Info, AlertTriangle, Wrench, Recycle, ArrowRight,
} from 'lucide-react'
import { getRoadmapPhases } from './roadmapData'
import { buildFilterResult } from './roadmapFilter'
import type {
  RoadmapStep, RoadmapPhase, StepStatus, FilterResult,
  AssessmentResult, DeviceFormData, ReasoningChip,
} from '@/types'

// ── Helpers ──────────────────────────────────────────────────────

function resolveStatus(step: RoadmapStep, filter: FilterResult): StepStatus {
  if (step.completed)                                   return 'default' // done styling handled separately
  if (filter.unsafeStepIds.includes(step.id))           return 'unsafe'
  if (filter.skippedStepIds.includes(step.id))          return 'skipped'
  if (filter.priorityStepIds.includes(step.id))         return 'priority'
  if (filter.recommendedStepIds.includes(step.id))      return 'recommended'
  if (step.diy === 'info')                              return 'info'
  return 'default'
}

// colour tokens per status — all using existing Tailwind tokens
const STATUS_STYLES: Record<StepStatus | 'done', {
  card: string; dot: string; badge: string; badgeText: string
}> = {
  priority:    { card: 'border-purple bg-purple/20',    dot: 'border-purple bg-purple/20 text-ink',         badge: 'bg-ink text-surface',              badgeText: 'PRIORITY' },
  recommended: { card: 'border-brand-700 bg-brand-100', dot: 'border-brand-700 bg-brand-100 text-brand-700', badge: 'bg-brand-700 text-surface',         badgeText: 'REC' },
  info:        { card: 'border-ink/30 bg-canvas',       dot: 'border-ink/40 bg-canvas text-muted',           badge: 'bg-ink/10 text-ink',                badgeText: 'INFO' },
  unsafe:      { card: 'border-recycle-700 bg-recycle-100 cursor-not-allowed', dot: 'border-recycle-700 bg-recycle-100 text-recycle-700', badge: 'bg-recycle-700 text-surface', badgeText: '⚠ UNSAFE' },
  skipped:     { card: 'border-divider bg-canvas opacity-40 cursor-default',   dot: 'border-divider bg-canvas text-muted opacity-40',     badge: 'bg-divider text-muted',       badgeText: 'N/A' },
  default:     { card: 'border-divider bg-surface',     dot: 'border-divider bg-surface text-muted',         badge: '',                                  badgeText: '' },
  done:        { card: 'border-ink/30 bg-ink/5',        dot: 'border-ink bg-ink text-surface',               badge: 'bg-ink text-surface',               badgeText: 'DONE' },
}

const DIY_LABELS: Record<string, { text: string; cls: string }> = {
  safe:    { text: '✓ DIY-safe',          cls: 'text-brand-700 border-brand-700' },
  shop:    { text: '🏪 Shop recommended', cls: 'text-blue-700 border-blue-700' },
  caution: { text: '⚠ DIY with caution', cls: 'text-recycle-700 border-recycle-700' },
  info:    { text: 'ℹ Decision gate',    cls: 'text-blue-700 border-blue-700' },
}

// ── Reasoning strip ──────────────────────────────────────────────

const CHIP_STYLES: Record<string, string> = {
  age:    'bg-blue-50 text-blue-700 border border-blue-300',
  damage: 'bg-recycle-100 text-recycle-700 border border-recycle-300',
  danger: 'bg-red-50 text-red-700 border border-red-300',
  score:  'bg-brand-100 text-brand-700 border border-brand-300',
  brand:  'bg-canvas text-muted border border-divider',
}

function ReasoningStrip({ chips }: { chips: ReasoningChip[] }) {
  if (!chips.length) return null
  return (
    <div className="border-b border-divider bg-surface px-4 py-2 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-muted shrink-0">Why this roadmap</span>
        {chips.map((c, i) => (
          <span key={i} className={`rounded px-2 py-0.5 text-xs font-semibold ${CHIP_STYLES[c.cls] ?? CHIP_STYLES.brand}`}>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Sub-step row ─────────────────────────────────────────────────

type SubItem = NonNullable<RoadmapStep['subItems']>[number]

function SubRow({
  item,
  onToggle,
}: {
  item: SubItem
  onToggle: (id: string) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${item.title}: ${item.completed ? 'completed' : 'not completed'}`}
      onClick={() => onToggle(item.id)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(item.id) } }}
      className={`flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-all hover:shadow-sm focus-visible:outline-2 focus-visible:outline-ink ${
        item.completed ? 'border-ink/20 bg-ink/5' : 'border-divider bg-surface hover:border-ink/30'
      }`}
    >
      {/* checkbox dot */}
      <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        item.completed ? 'border-ink bg-ink' : 'border-divider'
      }`}>
        {item.completed && <CheckCircle2 className="h-3 w-3 text-surface" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium leading-snug ${item.completed ? 'line-through text-muted' : 'text-ink'}`}>
          {item.title}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-muted">{item.description}</p>
      </div>
    </div>
  )
}

// ── Step card ────────────────────────────────────────────────────

function StepCard({
  step,
  stepNumber,
  status,
  filter,
  onToggleStep,
  onToggleSub,
  onToggleOpen,
}: {
  step: RoadmapStep
  stepNumber: number
  status: StepStatus
  filter: FilterResult
  onToggleStep: (id: string) => void
  onToggleSub: (stepId: string, subId: string) => void
  onToggleOpen: (id: string) => void
}) {
  const styles     = step.completed ? STATUS_STYLES.done : STATUS_STYLES[status]
  const isUnsafe   = status === 'unsafe'
  const isSkipped  = status === 'skipped'
  const isDone     = step.completed
  const isClickable = !isUnsafe && !isSkipped
  const hasSubs    = (step.subItems?.length ?? 0) > 0 && !isUnsafe && !isSkipped
  const diyStyle   = step.diy ? DIY_LABELS[step.diy] : null
  const skipReason = filter.skipReasons[step.id]

  const handleCardClick = () => { if (isClickable) onToggleStep(step.id) }
  const handleKeyDown   = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && isClickable) { e.preventDefault(); onToggleStep(step.id) }
  }

  return (
    <div className="relative">
      {/* Step number above the card (desktop) */}
      <span className="mb-1 hidden text-xs font-semibold text-muted md:block">
        {String(stepNumber).padStart(2, '0')}
      </span>

      {/* Main card */}
      <div
        role={isClickable ? 'button' : 'note'}
        tabIndex={isClickable ? 0 : -1}
        aria-label={`${step.title}${isDone ? ' (completed)' : ''}`}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        className={`group relative overflow-hidden rounded-xl border-2 p-4 transition-all ${styles.card} ${
          isClickable ? 'cursor-pointer hover:shadow-md focus-visible:outline-2 focus-visible:outline-ink' : ''
        }`}
      >
        {/* Accent top bar */}
        {(isDone || status === 'priority' || status === 'recommended' || status === 'unsafe') && (
          <div className={`absolute inset-x-0 top-0 h-1 ${
            isDone ? 'bg-ink' : status === 'priority' ? 'bg-purple' : status === 'recommended' ? 'bg-brand-600' : 'bg-recycle-700'
          }`} />
        )}

        <div className="flex items-start gap-3 pt-0.5">
          {/* Check circle */}
          <button
            onClick={e => { e.stopPropagation(); if (isClickable) onToggleStep(step.id) }}
            disabled={!isClickable}
            aria-label={`Mark "${step.title}" as ${isDone ? 'incomplete' : 'complete'}`}
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
              isDone
                ? 'border-ink bg-ink text-surface'
                : status === 'priority'
                  ? 'border-purple bg-purple/30 text-ink group-hover:border-purple'
                  : 'border-divider text-muted group-hover:border-ink/40'
            } ${!isClickable ? 'cursor-default opacity-50' : 'cursor-pointer'}`}
          >
            {isDone
              ? <CheckCircle2 className="h-4 w-4" aria-hidden />
              : <Circle className="h-4 w-4" aria-hidden />
            }
          </button>

          <div className="min-w-0 flex-1">
            {/* Title row */}
            <div className="flex flex-wrap items-center gap-2">
              {step.icon && <span aria-hidden className="text-base">{step.icon}</span>}
              <h3 className={`font-semibold text-sm md:text-base ${isDone ? 'line-through text-muted' : 'text-ink'}`}>
                {step.title}
              </h3>
              {styles.badgeText && (
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles.badge}`}>
                  {styles.badgeText}
                </span>
              )}
            </div>

            {/* Description */}
            <p className={`mt-1 text-xs md:text-sm ${isSkipped ? 'text-muted' : 'text-muted'}`}>
              {step.description}
            </p>

            {/* Skip reason */}
            {isSkipped && skipReason && (
              <p className="mt-1.5 rounded bg-ink/5 px-2 py-1 text-xs italic text-muted">
                Not needed: {skipReason}
              </p>
            )}

            {/* Unsafe warning */}
            {isUnsafe && (
              <div className="mt-2 flex items-start gap-1.5 rounded bg-recycle-100 px-2 py-1.5 text-xs font-semibold text-recycle-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Do not attempt without a certified technician. Take to a shop.
              </div>
            )}

            {/* DIY tag */}
            {!isUnsafe && !isSkipped && diyStyle && (
              <span className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${diyStyle.cls}`}>
                {diyStyle.text}
              </span>
            )}

            {/* Connect CTA */}
            {step.isConnect && !isSkipped && (
              <Link
                to={`/connect${step.connectFilter ? `?filter=${step.connectFilter}` : ''}`}
                state={{ direction: filter.direction }}
                onClick={e => e.stopPropagation()}
                className="btn-purple mt-3 inline-flex w-auto items-center gap-2 px-4 py-2 text-sm"
              >
                Find a {filter.direction === 'REPAIR' ? 'repair shop' : 'drop-off point'}
                <MapPin className="h-4 w-4" aria-hidden />
              </Link>
            )}

            {/* Ref link */}
            {step.refLabel && step.refUrl && !isSkipped && (
              <a
                href={step.refUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="mt-2 inline-flex items-center gap-1 border-b border-divider text-xs font-semibold text-muted transition-colors hover:border-ink hover:text-ink"
              >
                <ExternalLink className="h-3 w-3" aria-hidden />
                {step.refLabel}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Sub-steps toggle + list */}
      {hasSubs && (
        <div className="mt-2">
          <button
            onClick={() => onToggleOpen(step.id)}
            aria-expanded={step.subOpen}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-divider bg-canvas py-1.5 text-xs font-bold text-muted transition-all hover:border-ink hover:text-ink"
          >
            {step.subOpen
              ? <><ChevronUp className="h-3.5 w-3.5" aria-hidden /> Hide sub-steps ({step.subItems!.length})</>
              : <><ChevronDown className="h-3.5 w-3.5" aria-hidden /> Show sub-steps ({step.subItems!.length})</>
            }
          </button>
          {step.subOpen && (
            <div className="mt-2 space-y-1.5 pl-1 border-l-2 border-divider ml-3 animate-in fade-in-0 slide-in-from-top-1 duration-150">
              {step.subItems!.map(sub => (
                <SubRow key={sub.id} item={sub} onToggle={subId => onToggleSub(step.id, subId)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Phase section ────────────────────────────────────────────────

function PhaseSection({
  phase, phaseIndex, filter, onToggleStep, onToggleSub, onToggleOpen, stepOffset,
}: {
  phase: RoadmapPhase
  phaseIndex: number
  filter: FilterResult
  onToggleStep: (id: string) => void
  onToggleSub: (stepId: string, subId: string) => void
  onToggleOpen: (id: string) => void
  stepOffset: number
}) {
  return (
    <div>
      {/* Phase header */}
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-surface">
          {phaseIndex + 1}
        </span>
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted">{phase.phase}</span>
        <div className="flex-1 border-t border-divider" />
      </div>

      {/* Horizontal scroll on md+, vertical stack on mobile */}
      <div className="md:overflow-x-auto md:pb-2">
        <div className="flex flex-col gap-4 md:flex-row md:gap-0">
          {phase.steps.map((step, i) => {
            const status = resolveStatus(step, filter)
            return (
              <div key={step.id} className="md:w-56 md:shrink-0 md:px-2">
                <StepCard
                  step={step}
                  stepNumber={stepOffset + i + 1}
                  status={status}
                  filter={filter}
                  onToggleStep={onToggleStep}
                  onToggleSub={onToggleSub}
                  onToggleOpen={onToggleOpen}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────

export default function NavigatePage() {
  const nav      = useNavigate()
  const location = useLocation()
  const state    = location.state as {
    result?: AssessmentResult
    form?: DeviceFormData
  } | null

  const result    = state?.result ?? null
  const form      = state?.form   ?? null
  const direction = result?.direction ?? 'REPAIR'
  const deviceLabel = form ? `${form.brand} ${form.model}`.trim() || 'your device' : 'your device'

  // Build filter from real assessment data (or an empty no-op filter if missing)
  const filter: FilterResult = result && form
    ? buildFilterResult(form, result)
    : {
        direction: direction as 'REPAIR' | 'RECYCLE',
        score: result?.score ?? 0,
        reasoningChips: [],
        priorityStepIds: [],
        recommendedStepIds: [],
        skippedStepIds: [],
        unsafeStepIds: [],
        skipReasons: {},
      }

  // Local state: phases with per-step completed + subOpen flags
  const [phases, setPhases] = useState<RoadmapPhase[]>(() =>
    getRoadmapPhases(direction)
  )

  // Re-init when direction changes (e.g. user navigates back and re-assesses)
  useEffect(() => {
    setPhases(getRoadmapPhases(direction))
  }, [direction])

  // Toggle a top-level step
  const toggleStep = useCallback((id: string) => {
    setPhases(prev => prev.map(ph => ({
      ...ph,
      steps: ph.steps.map(s => s.id === id ? { ...s, completed: !s.completed } : s),
    })))
  }, [])

  // Toggle a sub-step
  const toggleSub = useCallback((stepId: string, subId: string) => {
    setPhases(prev => prev.map(ph => ({
      ...ph,
      steps: ph.steps.map(s => s.id !== stepId ? s : {
        ...s,
        subItems: s.subItems?.map(si => si.id === subId ? { ...si, completed: !si.completed } : si),
      }),
    })))
  }, [])

  // Toggle sub-step list open/closed
  const toggleOpen = useCallback((id: string) => {
    setPhases(prev => prev.map(ph => ({
      ...ph,
      steps: ph.steps.map(s => s.id === id ? { ...s, subOpen: !s.subOpen } : s),
    })))
  }, [])

  // Progress calculation — exclude skipped steps
  const skippedIds = filter.skippedStepIds
  const allSteps      = phases.flatMap(ph => ph.steps)
  const relevantSteps = allSteps.filter(s => !skippedIds.includes(s.id))
  const relevantSubs  = relevantSteps.flatMap(s => s.subItems ?? [])

  const doneSteps = relevantSteps.filter(s => s.completed).length
  const doneSubs  = relevantSubs.filter(si => si.completed).length
  const total     = relevantSteps.length + relevantSubs.length
  const done      = doneSteps + doneSubs
  const progress  = total > 0 ? Math.round((done / total) * 100) : 0
  const isComplete = done === total && total > 0

  // Step offset for global numbering
  let stepOffset = 0

  return (
    <div className="min-h-screen bg-section-roadmap">
      {/* Reasoning strip — shows why this roadmap was generated */}
      <ReasoningStrip chips={filter.reasoningChips} />

      <div className="page-container-md">
        {/* ── Header ── */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-ink sm:text-2xl md:text-3xl">
              Your {direction === 'REPAIR' ? 'Repair' : 'Recycle'} Roadmap
            </h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              direction === 'REPAIR' ? 'bg-ink/10 text-ink' : 'bg-brand-100 text-brand-700'
            }`}>
              {direction === 'REPAIR'
                ? <span className="flex items-center gap-1"><Wrench className="h-3 w-3" aria-hidden />REPAIR</span>
                : <span className="flex items-center gap-1"><Recycle className="h-3 w-3" aria-hidden />RECYCLE</span>
              }
            </span>
            {result && (
              <span className="rounded-full bg-canvas px-2.5 py-0.5 text-xs font-semibold text-muted">
                Score: {result.score}/100 · {result.confidence} confidence
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            Follow these steps to responsibly handle{' '}
            <span className="font-medium text-ink">{deviceLabel}</span>.
            {form?.issue && <> Diagnosed issue: <span className="font-medium text-ink">{form.issue}</span>.</>}
          </p>
        </div>

        {/* ── Progress bar ── */}
        <div className="mb-6 rounded-xl border border-divider bg-surface p-3 md:p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-ink">Progress</span>
            <span className="text-muted">{done} of {total} steps</span>
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
              className="h-2.5 rounded-full bg-ink transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {isComplete && (
            <div className="mt-3 flex items-center gap-2 text-sm font-medium text-ink">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              All steps completed! 🎉
            </div>
          )}
        </div>

        {/* ── Recycle mandatory wipe notice ── */}
        {direction === 'RECYCLE' && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-ink/20 bg-ink/5 p-3 md:p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-ink" aria-hidden />
            <div>
              <p className="text-sm font-medium text-ink">Data wipe is mandatory</p>
              <p className="mt-1 text-xs md:text-sm text-muted">
                Before recycling, permanently erase all personal data from your device
                as required by the Data Privacy Act (R.A. 10173).
              </p>
            </div>
          </div>
        )}

        {/* ── Assessment result context card ── */}
        {result && (
          <div className="mb-6 rounded-xl border border-divider bg-surface p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted">Assessment result</p>
            <p className="mt-1.5 text-sm text-ink">{result.rationale}</p>
            {result.costEstimate && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-purple/30 px-3 py-1.5 text-sm font-medium text-ink">
                <Info className="h-4 w-4" aria-hidden />
                Estimated repair cost: ₱{result.costEstimate.min.toLocaleString()} – ₱{result.costEstimate.max.toLocaleString()}
              </div>
            )}
            {result.modelLabel && (
              <p className="mt-2 text-xs text-muted">
                Screen analysis: <span className="font-semibold text-ink">{result.modelLabel}</span>
                {' '}({((result.modelProbability ?? 0) * 100).toFixed(1)}% confidence)
              </p>
            )}
          </div>
        )}

        {/* ── Legend ── */}
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-divider bg-surface px-4 py-2.5">
          <span className="text-xs font-bold uppercase tracking-widest text-muted">Legend</span>
          {[
            { dot: 'bg-purple',     label: 'Highest priority' },
            { dot: 'bg-brand-600',  label: 'Recommended' },
            { dot: 'bg-ink/30',     label: 'Info / decision' },
            { dot: 'bg-recycle-700',label: 'Unsafe — shop only' },
            { dot: 'bg-ink',        label: 'Completed' },
            { dot: 'bg-divider',    label: 'Not applicable' },
          ].map(({ dot, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
              {label}
            </span>
          ))}
        </div>

        {/* ── Roadmap phases ── */}
        <div className="space-y-8">
          {phases.map((phase, phaseIdx) => {
            const offset = stepOffset
            stepOffset += phase.steps.length
            return (
              <PhaseSection
                key={phase.phase}
                phase={phase}
                phaseIndex={phaseIdx}
                filter={filter}
                onToggleStep={toggleStep}
                onToggleSub={toggleSub}
                onToggleOpen={toggleOpen}
                stepOffset={offset}
              />
            )
          })}
        </div>

        {/* ── Completion banner ── */}
        {isComplete && (
          <div className="mt-8 rounded-2xl border-2 border-ink bg-section-hero p-6 text-center">
            <h3 className="text-xl font-bold text-ink">🎉 All steps completed!</h3>
            <p className="mt-1 text-sm text-muted">
              Head to <strong>Connect</strong> to find a certified{' '}
              {direction === 'REPAIR' ? 'repair shop' : 'recycling facility'} near you.
            </p>
            <Link to={`/connect?filter=${direction === 'REPAIR' ? 'repair' : 'recycling'}`} className="btn-accent mt-4 inline-flex w-auto gap-2">
              Open Connect <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        )}

        {/* ── No assessment fallback ── */}
        {!result && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted">
              No assessment found.{' '}
              <button
                onClick={() => nav('/assess')}
                className="font-medium text-ink underline hover:opacity-70"
              >
                Take an assessment first
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
