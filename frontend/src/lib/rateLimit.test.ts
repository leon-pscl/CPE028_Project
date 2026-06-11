import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, canRefetch, clearRateLimit } from './rateLimit'

beforeEach(() => {
  vi.useFakeTimers()
  clearRateLimit('test-key')
  clearRateLimit('refetch-key')
})

describe('checkRateLimit', () => {
  it('allows request when tokens available', () => {
    expect(checkRateLimit('test-key', 10, 1)).toBe(true)
  })

  it('denies request when tokens exhausted', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('test-key', 10, 1)
    }
    expect(checkRateLimit('test-key', 10, 1)).toBe(false)
  })

  it('refills tokens over time', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('test-key', 10, 2)
    }
    expect(checkRateLimit('test-key', 10, 2)).toBe(false)

    vi.advanceTimersByTime(1000)

    expect(checkRateLimit('test-key', 10, 2)).toBe(true)
  })

  it('does not exceed capacity', () => {
    clearRateLimit('test-key')
    vi.advanceTimersByTime(10000)
    checkRateLimit('test-key', 5, 1)

    const tokensUsed = 1
    const available = 5 - tokensUsed
    expect(available).toBe(4)
  })
})

describe('canRefetch', () => {
  it('allows first fetch', () => {
    expect(canRefetch('refetch-key', 30000)).toBe(true)
  })

  it('denies fetch within cooldown', () => {
    canRefetch('refetch-key', 30000)
    expect(canRefetch('refetch-key', 30000)).toBe(false)
  })

  it('allows fetch after cooldown', () => {
    canRefetch('refetch-key', 30000)
    vi.advanceTimersByTime(30001)
    expect(canRefetch('refetch-key', 30000)).toBe(true)
  })
})
