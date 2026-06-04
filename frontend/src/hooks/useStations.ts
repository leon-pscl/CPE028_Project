import { useState, useMemo, useCallback, useRef } from 'react';
import { Station, FilterType, GeocodeResult } from '../types/station';
import {
  filterStations,
  searchStations,
  withDistances,
  geocodeQuery,
} from '../lib/stationUtils';
import { useNearbySearch } from './useNearbySearch';

interface UseStationsReturn {
  displayedStations: Station[];
  allFiltered: Station[];
  filter: FilterType;
  searchQuery: string;
  setFilter: (f: FilterType) => void;
  setSearchQuery: (q: string) => void;
  geocodeSuggestions: GeocodeResult[];
  isGeocoding: boolean;
  runGeocode: (q: string) => Promise<void>;
  clearSuggestions: () => void;
  selectedStation: Station | null;
  setSelectedStation: (s: Station | null) => void;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStations(
  userLat?: number,
  userLng?: number,
  userId?: string,
  role?: string
): UseStationsReturn {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [geocodeSuggestions, setGeocodeSuggestions] = useState<GeocodeResult[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const { allStations, isLoading, error, refetch } = useNearbySearch(userLat, userLng, userId, role);

  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allFiltered = useMemo(() => {
    let result = filterStations(allStations, filter);
    result = searchStations(result, searchQuery);
    return result;
  }, [allStations, filter, searchQuery]);

  const displayedStations = useMemo(() => {
    if (userLat !== undefined && userLng !== undefined) {
      return withDistances(allFiltered, userLat, userLng);
    }
    return allFiltered;
  }, [allFiltered, userLat, userLng]);

  const runGeocode = useCallback(async (q: string) => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    if (!q.trim()) {
      setGeocodeSuggestions([]);
      return;
    }
    geocodeTimer.current = setTimeout(async () => {
      setIsGeocoding(true);
      try {
        const results = await geocodeQuery(q);
        setGeocodeSuggestions(results);
      } catch {
        setGeocodeSuggestions([]);
      } finally {
        setIsGeocoding(false);
      }
    }, 400);
  }, []);

  const clearSuggestions = useCallback(() => setGeocodeSuggestions([]), []);

  return {
    displayedStations,
    allFiltered,
    filter,
    searchQuery,
    setFilter,
    setSearchQuery,
    geocodeSuggestions,
    isGeocoding,
    runGeocode,
    clearSuggestions,
    selectedStation,
    setSelectedStation,
    isLoading,
    error,
    refetch,
  };
}
