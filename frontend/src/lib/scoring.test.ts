import { describe, it, expect } from 'vitest'
import { computeScore } from '../features/assess/scoring'
import type { DeviceFormData } from '@/types'

function makeFormData(overrides: Partial<DeviceFormData> = {}): DeviceFormData {
  return {
    brand: 'Samsung',
    model: 'Galaxy A54',
    ageMonths: 12,
    damageDescription: 'cracked screen',
    ...overrides,
  }
}

describe('scoring', () => {
  describe('computeScore', () => {
    it('returns a score between 0 and 100', () => {
      const result = computeScore(makeFormData())
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    it('returns REPAIR direction for high score', () => {
      const result = computeScore(makeFormData({ ageMonths: 6 }))
      expect(result.direction).toBe('REPAIR')
    })

    it('returns RECYCLE direction for very old device with poor support', () => {
      const result = computeScore(makeFormData({
        brand: 'Generic',
        model: 'OldPhone',
        ageMonths: 72,
        damageDescription: 'overheating problems',
      }))
      expect(result.direction).toBe('RECYCLE')
    })

    it('applies hard override for motherboard failure > 48 months', () => {
      const result = computeScore(makeFormData({
        ageMonths: 60,
        damageDescription: 'motherboard failure',
      }))
      expect(result.direction).toBe('RECYCLE')
      expect(result.score).toBeLessThanOrEqual(25)
    })

    it('applies hard override for water damage > 36 months', () => {
      const result = computeScore(makeFormData({
        ageMonths: 40,
        damageDescription: 'water damage spill',
      }))
      expect(result.direction).toBe('RECYCLE')
      expect(result.score).toBeLessThanOrEqual(25)
    })

    it('returns confidence level', () => {
      const result = computeScore(makeFormData())
      expect(['high', 'medium', 'low']).toContain(result.confidence)
    })

    it('returns rationale string', () => {
      const result = computeScore(makeFormData())
      expect(typeof result.rationale).toBe('string')
      expect(result.rationale.length).toBeGreaterThan(0)
    })

    it('returns costEstimate with min and max', () => {
      const result = computeScore(makeFormData())
      expect(result.costEstimate.min).toBeGreaterThanOrEqual(0)
      expect(result.costEstimate.max).toBeGreaterThanOrEqual(result.costEstimate.min)
    })

    it('higher age reduces score', () => {
      const young = computeScore(makeFormData({ ageMonths: 6 }))
      const old = computeScore(makeFormData({ ageMonths: 60 }))
      expect(young.score).toBeGreaterThan(old.score)
    })

    it('software issues get high score (low cost, high parts availability)', () => {
      const result = computeScore(makeFormData({ damageDescription: 'software bug glitch' }))
      expect(result.direction).toBe('REPAIR')
    })
  })
})
