/**
 * useRoadmapProgress.ts
 * ---------------------
 * Persists roadmap checklist progress for a given assessment.
 *
 * Strategy (two-layer):
 *   1. localStorage  — instant restore on mount, no network flash
 *   2. Supabase      — durable cross-device persistence, loaded async
 *
 * On every toggle:
 *   • phases state is updated immediately (React)
 *   • localStorage is written synchronously
 *   • Supabase upsert is debounced 1.5 s to batch rapid clicks
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getRoadmapPhases } from '../features/navigate/roadmapData'
import { db } from '../lib/database'
import type { RoadmapPhase } from '../types'

// ── Types ────────────────────────────────────────────────────────

export interface ProgressSnapshot {
  completedStepIds: string[]
  completedSubIds:  string[]
  activePhaseIdx:   number
  activeStepIdx:    number
}

interface UseRoadmapProgressReturn {
  phases:           RoadmapPhase[]
  activePhaseIdx:   number
  activeStepIdx:    number
  progressLoading:  boolean
  toggleStep:       (id: string) => void
  toggleSub:        (stepId: string, subId: string) => void
  setActivePhase:   (idx: number) => void
  setActiveStep:    (idx: number) => void
  selectStep:       (phaseIdx: number, stepIdx: number) => void
}

// ── localStorage helpers ─────────────────────────────────────────

function lsKey(assessmentId: string) {
  return `roadmap_progress:${assessmentId}`
}

function readFromStorage(assessmentId: string): ProgressSnapshot | null {
  try {
    const raw = localStorage.getItem(lsKey(assessmentId))
    if (!raw) return null
    return JSON.parse(raw) as ProgressSnapshot
  } catch {
    return null
  }
}

function writeToStorage(assessmentId: string, snap: ProgressSnapshot) {
  try {
    localStorage.setItem(lsKey(assessmentId), JSON.stringify(snap))
  } catch {
    // storage quota — silently ignore
  }
}

// ── Apply snapshot to fresh phases ──────────────────────────────

function applySnapshot(
  phases: RoadmapPhase[],
  snap: ProgressSnapshot,
): RoadmapPhase[] {
  const stepSet = new Set(snap.completedStepIds)
  const subSet  = new Set(snap.completedSubIds)
  return phases.map(ph => ({
    ...ph,
    steps: ph.steps.map(s => ({
      ...s,
      completed: stepSet.has(s.id),
      subItems: s.subItems?.map(si => ({
        ...si,
        completed: subSet.has(si.id),
      })),
    })),
  }))
}

// ── Extract snapshot from current phases ─────────────────────────

function extractSnapshot(
  phases: RoadmapPhase[],
  activePhaseIdx: number,
  activeStepIdx:  number,
): ProgressSnapshot {
  const completedStepIds: string[] = []
  const completedSubIds:  string[] = []
  for (const ph of phases) {
    for (const s of ph.steps) {
      if (s.completed) completedStepIds.push(s.id)
      for (const si of s.subItems ?? []) {
        if (si.completed) completedSubIds.push(si.id)
      }
    }
  }
  return { completedStepIds, completedSubIds, activePhaseIdx, activeStepIdx }
}

// ── Merge two snapshots (union of completed IDs, prefer DB nav) ──

function mergeSnapshots(
  local: ProgressSnapshot | null,
  remote: ProgressSnapshot | null,
): ProgressSnapshot | null {
  if (!local && !remote) return null
  if (!local) return remote
  if (!remote) return local
  return {
    completedStepIds: [...new Set([...local.completedStepIds, ...remote.completedStepIds])],
    completedSubIds:  [...new Set([...local.completedSubIds,  ...remote.completedSubIds])],
    // Prefer remote nav position (last saved from a previous session)
    activePhaseIdx: remote.activePhaseIdx,
    activeStepIdx:  remote.activeStepIdx,
  }
}

// ── Hook ─────────────────────────────────────────────────────────

export function useRoadmapProgress(
  assessmentId: string | undefined,
  direction: 'REPAIR' | 'RECYCLE',
  userId: string | undefined,
): UseRoadmapProgressReturn {
  const [phases,         setPhases]         = useState<RoadmapPhase[]>(() => getRoadmapPhases(direction))
  const [activePhaseIdx, setActivePhaseIdx] = useState(0)
  const [activeStepIdx,  setActiveStepIdx]  = useState(0)
  const [progressLoading, setProgressLoading] = useState(!!assessmentId)

  // Track direction changes
  const directionRef = useRef(direction)

  // Debounce timer ref
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track whether we've done the initial load
  const initialised = useRef(false)

  // ── Reset when direction or assessmentId changes ───────────────
  useEffect(() => {
    const fresh = getRoadmapPhases(direction)
    directionRef.current = direction

    if (!assessmentId) {
      setPhases(fresh)
      setActivePhaseIdx(0)
      setActiveStepIdx(0)
      setProgressLoading(false)
      initialised.current = false
      return
    }

    // 1. Instant restore from localStorage
    const local = readFromStorage(assessmentId)
    if (local) {
      setPhases(applySnapshot(fresh, local))
      setActivePhaseIdx(local.activePhaseIdx)
      setActiveStepIdx(local.activeStepIdx)
    } else {
      setPhases(fresh)
      setActivePhaseIdx(0)
      setActiveStepIdx(0)
    }

    setProgressLoading(true)

    // 2. Async load from Supabase then merge
    let cancelled = false
    async function loadFromDb() {
      try {
        const { data, error } = await db.roadmapProgress.getByAssessmentId(assessmentId!)
        if (cancelled) return
        if (!error && data) {
          const remote: ProgressSnapshot = {
            completedStepIds: (data.completed_step_ids as string[]) ?? [],
            completedSubIds:  (data.completed_sub_ids  as string[]) ?? [],
            activePhaseIdx:   data.active_phase_idx ?? 0,
            activeStepIdx:    data.active_step_idx  ?? 0,
          }
          const merged = mergeSnapshots(local, remote)
          if (merged) {
            const freshPhases = getRoadmapPhases(directionRef.current)
            setPhases(applySnapshot(freshPhases, merged))
            setActivePhaseIdx(merged.activePhaseIdx)
            setActiveStepIdx(merged.activeStepIdx)
            writeToStorage(assessmentId!, merged)
          }
        }
      } catch {
        // Supabase unavailable — localStorage is fine
      } finally {
        if (!cancelled) {
          setProgressLoading(false)
          initialised.current = true
        }
      }
    }
    loadFromDb()

    return () => { cancelled = true }
  }, [assessmentId, direction])

  // ── Persist helper ────────────────────────────────────────────
  const persist = useCallback(
    (nextPhases: RoadmapPhase[], phaseIdx: number, stepIdx: number) => {
      if (!assessmentId) return
      const snap = extractSnapshot(nextPhases, phaseIdx, stepIdx)

      // Layer 1: localStorage — synchronous
      writeToStorage(assessmentId, snap)

      // Layer 2: Supabase — debounced
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        if (!userId) return
        try {
          await db.roadmapProgress.upsert({
            user_id:              userId,
            assessment_result_id: assessmentId,
            completed_step_ids:   snap.completedStepIds,
            completed_sub_ids:    snap.completedSubIds,
            active_phase_idx:     snap.activePhaseIdx,
            active_step_idx:      snap.activeStepIdx,
          })
        } catch {
          // silent — localStorage still has it
        }
      }, 1500)
    },
    [assessmentId, userId],
  )

  // ── Toggles ───────────────────────────────────────────────────
  const toggleStep = useCallback((id: string) => {
    setPhases(prev => {
      const next = prev.map(ph => ({
        ...ph,
        steps: ph.steps.map(s => s.id === id ? { ...s, completed: !s.completed } : s),
      }))
      persist(next, activePhaseIdx, activeStepIdx)
      return next
    })
  }, [activePhaseIdx, activeStepIdx, persist])

  const toggleSub = useCallback((stepId: string, subId: string) => {
    setPhases(prev => {
      const next = prev.map(ph => ({
        ...ph,
        steps: ph.steps.map(s => s.id !== stepId ? s : {
          ...s,
          subItems: s.subItems?.map(si =>
            si.id === subId ? { ...si, completed: !si.completed } : si,
          ),
        }),
      }))
      persist(next, activePhaseIdx, activeStepIdx)
      return next
    })
  }, [activePhaseIdx, activeStepIdx, persist])

  // ── Navigation ────────────────────────────────────────────────
  const setActivePhase = useCallback((idx: number) => {
    setActivePhaseIdx(idx)
    setActiveStepIdx(0)
    // Persist nav position
    setPhases(prev => { persist(prev, idx, 0); return prev })
  }, [persist])

  const setActiveStep = useCallback((idx: number) => {
    setActiveStepIdx(idx)
    setPhases(prev => { persist(prev, activePhaseIdx, idx); return prev })
  }, [activePhaseIdx, persist])

  const selectStep = useCallback((phaseIdx: number, stepIdx: number) => {
    setActivePhaseIdx(phaseIdx)
    setActiveStepIdx(stepIdx)
    setPhases(prev => { persist(prev, phaseIdx, stepIdx); return prev })
  }, [persist])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [])

  return {
    phases,
    activePhaseIdx,
    activeStepIdx,
    progressLoading,
    toggleStep,
    toggleSub,
    setActivePhase,
    setActiveStep,
    selectStep,
  }
}
