import { Station, FilterType, GeocodeResult, StationType } from '../types/station';
import { geocodeAutocomplete } from './geoapify';

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

export function filterStations(
  stations: Station[],
  filter: FilterType
): Station[] {
  if (filter === 'all') return stations;
  return stations.filter((s) => s.types.includes(filter));
}

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

const CACHE_PREFIX = 'redevice_geocode_';

export async function geocodeQuery(query: string): Promise<GeocodeResult[]> {
  if (!query.trim()) return [];

  const cacheKey = CACHE_PREFIX + query.toLowerCase().trim();

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  const results = await geocodeAutocomplete(query);

  try {
    localStorage.setItem(cacheKey, JSON.stringify(results));
  } catch {}

  return results;
}

export function stationTypeLabel(types: StationType[]): string {
  if (types.includes('repair') && types.includes('recycle')) return 'Repair & Recycle';
  if (types.includes('repair')) return 'Repair';
  return 'Recycle';
}
