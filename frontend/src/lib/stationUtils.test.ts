// src/lib/stationUtils.test.ts
// Run with: npx vitest run

import { describe, it, expect } from 'vitest';
import {
  haversineKm,
  formatDistance,
  filterStations,
  searchStations,
  withDistances,
} from './stationUtils';
import { Station } from '../types/station';

// ── Sample data ──────────────────────────────────────────────────────────────
const mockStations: Station[] = [
  {
    id: 'r-001',
    name: 'TechFix Manila',
    types: ['repair'],
    address: '123 Rizal Ave',
    city: 'Manila',
    province: 'Metro Manila',
    lat: 14.6042,
    lng: 120.9822,
    accepts: ['smartphones'],
    verified: true,
    source: 'supabase',
  },
  {
    id: 'rc-001',
    name: 'EcoRecycle Hub',
    types: ['recycle'],
    address: '88 Ayala Ave',
    city: 'Makati',
    province: 'Metro Manila',
    lat: 14.5547,
    lng: 121.0244,
    accepts: ['laptops', 'batteries'],
    verified: true,
    source: 'supabase',
  },
  {
    id: 'r-002',
    name: 'Gadget Clinic Cebu',
    types: ['repair'],
    address: '14 Colon St',
    city: 'Cebu City',
    province: 'Cebu',
    lat: 10.2969,
    lng: 123.9016,
    accepts: ['smartphones', 'laptops'],
    verified: false,
    source: 'supabase',
  },
];

// ── haversineKm ───────────────────────────────────────────────────────────────
describe('haversineKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineKm(14.6, 121.0, 14.6, 121.0)).toBeCloseTo(0);
  });

  it('correctly estimates Manila → Cebu (~590 km)', () => {
    const d = haversineKm(14.5995, 120.9842, 10.3157, 123.8854);
    expect(d).toBeGreaterThan(550);
    expect(d).toBeLessThan(650);
  });

  it('is symmetric', () => {
    const a = haversineKm(14.6, 121.0, 10.3, 123.9);
    const b = haversineKm(10.3, 123.9, 14.6, 121.0);
    expect(a).toBeCloseTo(b, 5);
  });
});

// ── formatDistance ────────────────────────────────────────────────────────────
describe('formatDistance', () => {
  it('shows meters for < 1 km', () => {
    expect(formatDistance(0.5)).toBe('500 m');
    expect(formatDistance(0.123)).toBe('123 m');
  });

  it('shows km for >= 1 km', () => {
    expect(formatDistance(1.0)).toBe('1.0 km');
    expect(formatDistance(12.456)).toBe('12.5 km');
  });
});

// ── filterStations ────────────────────────────────────────────────────────────
describe('filterStations', () => {
  it('returns all stations when filter is "all"', () => {
    expect(filterStations(mockStations, 'all')).toHaveLength(3);
  });

  it('returns only repair stations', () => {
    const result = filterStations(mockStations, 'repair');
    expect(result).toHaveLength(2);
    result.forEach((s) => expect(s.types).toContain('repair'));
  });

  it('returns only recycle stations', () => {
    const result = filterStations(mockStations, 'recycle');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rc-001');
  });

  it('returns empty array if no match', () => {
    expect(filterStations([], 'repair')).toHaveLength(0);
  });
});

// ── searchStations ────────────────────────────────────────────────────────────
describe('searchStations', () => {
  it('returns all stations on empty query', () => {
    expect(searchStations(mockStations, '')).toHaveLength(3);
  });

  it('matches by station name (case-insensitive)', () => {
    expect(searchStations(mockStations, 'techfix')).toHaveLength(1);
    expect(searchStations(mockStations, 'ECORECYCLE')).toHaveLength(1);
  });

  it('matches by city', () => {
    expect(searchStations(mockStations, 'cebu')).toHaveLength(1);
  });

  it('matches by province', () => {
    const result = searchStations(mockStations, 'metro manila');
    expect(result).toHaveLength(2);
  });

  it('returns empty on no match', () => {
    expect(searchStations(mockStations, 'davao')).toHaveLength(0);
  });
});

// ── withDistances ─────────────────────────────────────────────────────────────
describe('withDistances', () => {
  // User location: roughly Makati
  const userLat = 14.554;
  const userLng = 121.024;

  it('attaches distance to each station', () => {
    const result = withDistances(mockStations, userLat, userLng);
    result.forEach((s) => {
      expect(typeof s.distance).toBe('number');
      expect(s.distance).toBeGreaterThanOrEqual(0);
    });
  });

  it('sorts by distance ascending', () => {
    const result = withDistances(mockStations, userLat, userLng);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].distance!).toBeGreaterThanOrEqual(result[i - 1].distance!);
    }
  });

  it('nearest station to Makati is EcoRecycle Hub (same area)', () => {
    const result = withDistances(mockStations, userLat, userLng);
    expect(result[0].id).toBe('rc-001');
  });

  it('does not mutate original array', () => {
    withDistances(mockStations, userLat, userLng);
    mockStations.forEach((s) => expect(s.distance).toBeUndefined());
  });
});
