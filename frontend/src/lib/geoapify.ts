import { GeocodeResult } from '../types/station';
import { checkRateLimit } from './rateLimit';

const GEOAPIFY_BASE = 'https://api.geoapify.com';

function getApiKey(): string {
  const key = import.meta.env.VITE_GEOAPIFY_API_KEY;
  if (!key || key === 'your_geoapify_key_here') {
    console.warn('Geoapify API key not configured. Set VITE_GEOAPIFY_API_KEY in .env');
  }
  return key;
}

export interface GeoapifyPlace {
  place_id: string;
  name: string;
  formatted: string;
  lat: number;
  lng: number;
  categories: string[];
  distance?: number;
  opening_hours?: string;
}

export interface GeoapifyPlaceDetails {
  name: string;
  formatted: string;
  phone?: string;
  website?: string;
  opening_hours?: string;
  lat: number;
  lng: number;
}

const RATE_LIMIT_CAPACITY = 12;
const RATE_LIMIT_REFILL = 1;

export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  radiusMeters: number = 5000,
  categories: string[] = ['commercial.elektronics', 'service.recycling.centre'],
  limit: number = 20
): Promise<GeoapifyPlace[]> {
  if (!checkRateLimit('geoapify:places', RATE_LIMIT_CAPACITY, RATE_LIMIT_REFILL)) {
    console.warn('Rate limited: Geoapify Places search');
    return [];
  }

  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_geoapify_key_here') return [];

  const params = new URLSearchParams({
    categories: categories.join(','),
    filter: `circle:${lng},${lat},${radiusMeters}`,
    bias: `proximity:${lng},${lat}`,
    limit: String(limit),
    apiKey,
  });

  try {
    const res = await fetch(`${GEOAPIFY_BASE}/v2/places?${params}`);
    if (!res.ok) throw new Error(`Geoapify Places API error: ${res.status}`);
    const data = await res.json();

    return (data.features || []).map((f: any) => ({
      place_id: f.properties.place_id,
      name: f.properties.name || '',
      formatted: f.properties.formatted || '',
      lat: f.properties.lat,
      lng: f.properties.lon,
      categories: f.properties.categories || [],
      distance: f.properties.distance,
      opening_hours: f.properties.opening_hours,
    }));
  } catch (err) {
    console.error('Geoapify nearby search failed:', err);
    return [];
  }
}

export async function getPlaceDetails(placeId: string): Promise<GeoapifyPlaceDetails | null> {
  if (!checkRateLimit('geoapify:details', RATE_LIMIT_CAPACITY, RATE_LIMIT_REFILL)) {
    console.warn('Rate limited: Geoapify Place Details');
    return null;
  }

  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_geoapify_key_here') return null;

  try {
    const res = await fetch(
      `${GEOAPIFY_BASE}/v2/place-details?id=${placeId}&features=details&apiKey=${apiKey}`
    );
    if (!res.ok) throw new Error(`Geoapify Place Details error: ${res.status}`);
    const data = await res.json();

    const props = data.features?.[0]?.properties;
    if (!props) return null;

    return {
      name: props.name || '',
      formatted: props.formatted || '',
      phone: props.contact?.phone,
      website: props.website || props.datasource?.raw?.website,
      opening_hours: props.opening_hours,
      lat: props.lat,
      lng: props.lon,
    };
  } catch (err) {
    console.error('Geoapify place details failed:', err);
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!checkRateLimit('geoapify:reverse', RATE_LIMIT_CAPACITY, RATE_LIMIT_REFILL)) {
    console.warn('Rate limited: Geoapify Reverse Geocode');
    return null;
  }

  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_geoapify_key_here') return null;

  try {
    const res = await fetch(
      `${GEOAPIFY_BASE}/v1/geocode/reverse?lat=${lat}&lon=${lng}&lang=en&apiKey=${apiKey}`
    );
    if (!res.ok) throw new Error(`Geoapify Reverse Geocoding error: ${res.status}`);
    const data = await res.json();
    const feature = data.features?.[0];
    return feature?.properties?.formatted || feature?.properties?.address_line1 || null;
  } catch (err) {
    console.error('Geoapify reverse geocode failed:', err);
    return null;
  }
}

const CACHE_PREFIX = 'redevice_geocode_';

export async function geocodeAutocomplete(query: string): Promise<GeocodeResult[]> {
  if (!checkRateLimit('geoapify:geocode', RATE_LIMIT_CAPACITY, RATE_LIMIT_REFILL)) {
    console.warn('Rate limited: Geoapify Geocoding');
    return [];
  }

  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_geoapify_key_here') return [];

  const cacheKey = CACHE_PREFIX + query.toLowerCase().trim();

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  const params = new URLSearchParams({
    text: query,
    filter: 'countrycode:ph',
    lang: 'en',
    limit: '5',
    apiKey,
  });

  try {
    const res = await fetch(`${GEOAPIFY_BASE}/v1/geocode/autocomplete?${params}`);
    if (!res.ok) throw new Error(`Geoapify Geocoding error: ${res.status}`);
    const data = await res.json();

    const results: GeocodeResult[] = (data.features || []).map((f: any) => ({
      displayName: f.properties.formatted || f.properties.name || '',
      lat: f.properties.lat,
      lng: f.properties.lon,
    }));

    try {
      localStorage.setItem(cacheKey, JSON.stringify(results));
    } catch {}

    return results;
  } catch (err) {
    console.error('Geoapify geocoding failed:', err);
    return [];
  }
}
