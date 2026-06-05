import { useState, useEffect, useCallback } from 'react';
import { Station, StationType } from '../types/station';
import { searchNearbyPlaces } from '../lib/geoapify';
import { db } from '../lib/database';

const GEOAPIFY_CATEGORIES = [
  'commercial.elektronics',
  'service.recycling.centre',
];

function mapGeoapifyCategories(categories: string[]): StationType[] {
  const types: StationType[] = [];
  const hasRecycle = categories.some(
    (c) => c === 'service.recycling.centre' || c.startsWith('service.recycling.')
  );
  const hasRepair = categories.some(
    (c) => c !== 'service.recycling.centre' && !c.startsWith('service.recycling.')
  );
  if (hasRepair) types.push('repair');
  if (hasRecycle) types.push('recycle');
  if (types.length === 0) types.push('repair');
  return types;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function geoapifyToStation(place: any): Station {
  const cats = place.categories || [];
  return {
    id: `geo-${place.place_id}`,
    name: place.name || 'Unknown',
    types: mapGeoapifyCategories(cats),
    address: place.formatted || '',
    city: '',
    province: '',
    lat: place.lat,
    lng: place.lng,
    accepts: [],
    verified: false,
    rating: undefined,
    hours: place.opening_hours || undefined,
    distance: place.distance ? place.distance / 1000 : undefined,
    source: 'geoapify',
    geoapify_place_id: place.place_id,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function supabaseShopToStation(shop: any): Station {
  let types: StationType[] = [];
  if (shop.types && Array.isArray(shop.types) && shop.types.length > 0) {
    types = shop.types.filter((t: string) => t === 'repair' || t === 'recycle');
  } else {
    if (shop.type === 'recycling' || shop.type === 'recycle') types.push('recycle');
    if (shop.type === 'repair') types.push('repair');
    if (shop.type === 'recycle') types.push('repair');
  }
  if (types.length === 0) types.push('repair');

  const isUserSubmission = shop.source === 'user_submission' || (shop.task_id && !shop.is_verified);

  return {
    id: `sup-${shop.id}`,
    name: shop.name,
    types,
    address: shop.address,
    city: '',
    province: '',
    lat: shop.latitude || 0,
    lng: shop.longitude || 0,
    phone: shop.phone || undefined,
    website: shop.website || undefined,
    hours: shop.hours || undefined,
    accepts: shop.brands_serviced || shop.accepted_items || [],
    verified: shop.is_verified,
    rejected: shop.rejected || false,
    rating: undefined,
    distance: undefined,
    source: isUserSubmission ? 'user_submission' : 'supabase',
    shop_id: shop.id,
    task_id: shop.task_id || undefined,
    submitted_by: shop.submitted_by || undefined,
    submitted_at: shop.submitted_at || undefined,
    contributed_by: shop.contributed_by || undefined,
  };
}

function deduplicate(stations: Station[]): Station[] {
  const seen = new Map<string, Station>();

  for (const s of stations) {
    const key = `${s.lat.toFixed(4)}-${s.lng.toFixed(4)}`;
    const existing = seen.get(key);

    if (existing) {
      const priority: Record<string, number> = {
        user_submission: 3,
        supabase: 2,
        corrected: 2,
        geoapify: 1,
      };
      if ((priority[s.source] || 0) > (priority[existing.source] || 0)) {
        seen.set(key, s);
      }
    } else {
      seen.set(key, s);
    }
  }

  return Array.from(seen.values());
}

interface UseNearbySearchReturn {
  allStations: Station[];
  isLoading: boolean;
  error: string | null;
  searchRadius: number;
  setSearchRadius: (r: number) => void;
  refetch: () => void;
}

export function useNearbySearch(
  userLat?: number,
  userLng?: number,
  userId?: string,
  role?: string
): UseNearbySearchReturn {
  const [allStations, setAllStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState(5000);

  const fetchStations = useCallback(async () => {
    if (userLat === undefined || userLng === undefined) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const [geoapifyPlaces, { data: supabaseShops }, { data: overrides }] = await Promise.all([
      searchNearbyPlaces(userLat, userLng, searchRadius, GEOAPIFY_CATEGORIES, 20),
      db.directory.getNearby(userLat, userLng, searchRadius / 1000, null, userId, role),
      db.directory.getTypeOverrides(),
    ]);

    const geoapifyStations = geoapifyPlaces.map(geoapifyToStation).map((s) => {
      if (!s.geoapify_place_id) return s;
      const override = (overrides || []).find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (o: any) => o.geoapify_place_id === s.geoapify_place_id
      );
      if (!override) return s;
      return {
        ...s,
        types: override.types.filter((t: string) => t === 'repair' || t === 'recycle'),
        source: 'corrected' as const,
      };
    });
    const supabaseStations = (supabaseShops || []).map(supabaseShopToStation);

    const merged = deduplicate([...geoapifyStations, ...supabaseStations]);
    setAllStations(merged);
    setIsLoading(false);
  }, [userLat, userLng, searchRadius, userId, role]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  return {
    allStations,
    isLoading,
    error,
    searchRadius,
    setSearchRadius,
    refetch: fetchStations,
  };
}
