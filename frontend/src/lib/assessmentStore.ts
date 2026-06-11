import type { AssessmentResult, DeviceFormData } from '@/types'

const STORAGE_PREFIX = 'assessment_'

// Use crypto.randomUUID() for cryptographically secure IDs
function generateId(): string {
  return crypto.randomUUID()
}

export interface StoredAssessment {
  result: AssessmentResult
  form: DeviceFormData
}

export function saveAssessment(result: AssessmentResult, form: DeviceFormData): string {
  const id = generateId()
  const payload: StoredAssessment = { result: { ...result, id }, form }
  try {
    sessionStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(payload))
  } catch {
    // storage full or unavailable — degrade gracefully
  }
  return id
}

export function loadAssessment(id: string): StoredAssessment | null {
  // Validate UUID format before hitting storage
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRe.test(id)) return null
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + id)
    if (!raw) return null
    return JSON.parse(raw) as StoredAssessment
  } catch {
    return null
  }
}
