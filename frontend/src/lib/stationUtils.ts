// src/lib/stationUtils.ts

import { Station, FilterType, GeocodeResult } from '../types/station';

// ── Haversine distance (km) ──────────────────────────────────────────────────
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// ── Filter stations by type ──────────────────────────────────────────────────
export function filterStations(
  stations: Station[],
  filter: FilterType
): Station[] {
  if (filter === 'all') return stations;
  return stations.filter((s) => s.type === filter);
}

// ── Search stations by name or address (case-insensitive) ───────────────────
export function searchStations(
  stations: Station[],
  query: string
): Station[] {
  const q = query.toLowerCase().trim();
  if (!q) return stations;
  return stations.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.province.toLowerCase().includes(q)
  );
}

// ── Attach distances and sort nearest first ──────────────────────────────────
export function withDistances(
  stations: Station[],
  userLat: number,
  userLng: number
): Station[] {
  return stations
    .map((s) => ({
      ...s,
      distance: haversineKm(userLat, userLng, s.lat, s.lng),
    }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
}

// ── Nominatim geocoder (throttled, PH-biased) ───────────────────────────────
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const CACHE_PREFIX = 'redevice_geocode_';

export async function geocodeQuery(query: string): Promise<GeocodeResult[]> {
  const cacheKey = CACHE_PREFIX + query.toLowerCase().trim();

  // Try localStorage cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // localStorage unavailable — ignore
  }

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    countrycodes: 'ph',
    limit: '5',
    addressdetails: '0',
  });

  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'ReDevice-App/1.0' },
  });

  if (!res.ok) throw new Error('Geocoding request failed');

  const data = await res.json();
  const results: GeocodeResult[] = data.map((item: any) => ({
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }));

  // Cache result
  try {
    localStorage.setItem(cacheKey, JSON.stringify(results));
  } catch {
    // ignore storage errors
  }

  return results;
}
