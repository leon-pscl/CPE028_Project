import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  sanitizeUrl,
  sanitizePhone,
  sanitizeStationName,
  sanitizeAddress,
  validateRequired,
  validateLength,
  validateCoordinates,
  sanitizeForDb,
} from './sanitize'

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    )
  })

  it('escapes quotes and slashes', () => {
    expect(escapeHtml("it's a \"test\"")).toBe("it&#x27;s a &quot;test&quot;")
  })

  it('returns clean strings unchanged', () => {
    expect(escapeHtml('hello world 123')).toBe('hello world 123')
  })

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('')
  })
})

describe('sanitizeUrl', () => {
  it('allows https URLs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com/')
  })

  it('allows http URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com/')
  })

  it('allows mailto URLs', () => {
    expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com')
  })

  it('allows tel URLs', () => {
    expect(sanitizeUrl('tel:+639123456789')).toBe('tel:+639123456789')
  })

  it('blocks javascript URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('')
  })

  it('blocks data URLs', () => {
    expect(sanitizeUrl('data:text/html,<h1>hi</h1>')).toBe('')
  })

  it('returns empty for invalid URLs', () => {
    expect(sanitizeUrl('not a url')).toBe('')
  })
})

describe('sanitizePhone', () => {
  it('strips non-phone characters', () => {
    expect(sanitizePhone('+63 912 345 6789')).toBe('+63 912 345 6789')
  })

  it('allows parentheses and dashes', () => {
    expect(sanitizePhone('(02) 8123-4567')).toBe('(02) 8123-4567')
  })

  it('removes letters', () => {
    expect(sanitizePhone('abc123')).toBe('123')
  })
})

describe('sanitizeStationName', () => {
  it('strips HTML special chars', () => {
    expect(sanitizeStationName('<script>Shop</script>')).toBe('scriptShopscript')
  })

  it('truncates to 200 chars', () => {
    const long = 'A'.repeat(300)
    expect(sanitizeStationName(long)).toHaveLength(200)
  })

  it('trims whitespace', () => {
    expect(sanitizeStationName('  Shop Name  ')).toBe('Shop Name')
  })
})

describe('sanitizeAddress', () => {
  it('strips HTML special chars', () => {
    expect(sanitizeAddress('123 <b>Main</b> St')).toBe('123 bMainb St')
  })

  it('truncates to 500 chars', () => {
    const long = 'A'.repeat(600)
    expect(sanitizeAddress(long)).toHaveLength(500)
  })
})

describe('validateRequired', () => {
  it('returns error for empty string', () => {
    expect(validateRequired('', 'Name')).toBe('Name is required.')
  })

  it('returns error for whitespace-only', () => {
    expect(validateRequired('   ', 'Email')).toBe('Email is required.')
  })

  it('returns null for valid input', () => {
    expect(validateRequired('hello', 'Field')).toBeNull()
  })
})

describe('validateLength', () => {
  it('returns error when exceeds max', () => {
    expect(validateLength('a'.repeat(201), 'Name', 200)).toBe('Name must be 200 characters or less.')
  })

  it('returns null when within limit', () => {
    expect(validateLength('short', 'Name', 200)).toBeNull()
  })
})

describe('validateCoordinates', () => {
  it('returns error for null coordinates', () => {
    expect(validateCoordinates(null, null)).toBe('Coordinates are required.')
  })

  it('returns error for invalid latitude', () => {
    expect(validateCoordinates(91, 121)).toBe('Invalid latitude.')
  })

  it('returns error for invalid longitude', () => {
    expect(validateCoordinates(14, 181)).toBe('Invalid longitude.')
  })

  it('returns null for valid coordinates', () => {
    expect(validateCoordinates(14.5995, 120.9842)).toBeNull()
  })
})

describe('sanitizeForDb', () => {
  it('removes special characters', () => {
    const result = sanitizeForDb('Shop <Name> & "Location"')
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
  })

  it('preserves normal text', () => {
    expect(sanitizeForDb('TechFix Manila')).toBe('TechFix Manila')
  })

  it('preserves numbers and basic punctuation', () => {
    expect(sanitizeForDb('123 Rizal Ave.')).toBe('123 Rizal Ave.')
  })
})
