// src/hooks/useStations.ts

import { useState, useMemo, useCallback, useRef } from 'react';
import { Station, FilterType, GeocodeResult } from '../types/station';
import { STATIONS } from '../lib/stationsData';
import {
  filterStations,
  searchStations,
  withDistances,
  geocodeQuery,
} from '../lib/stationUtils';

interface UseStationsReturn {
  // Derived data
  displayedStations: Station[];
  allFiltered: Station[];

  // Filter / search state
  filter: FilterType;
  searchQuery: string;
  setFilter: (f: FilterType) => void;
  setSearchQuery: (q: string) => void;

  // Geocode suggestions
  geocodeSuggestions: GeocodeResult[];
  isGeocoding: boolean;
  runGeocode: (q: string) => Promise<void>;
  clearSuggestions: () => void;

  // Selected station (for panel)
  selectedStation: Station | null;
  setSelectedStation: (s: Station | null) => void;
}

export function useStations(
  userLat?: number,
  userLng?: number
): UseStationsReturn {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [geocodeSuggestions, setGeocodeSuggestions] = useState<GeocodeResult[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Throttle geocode calls — only fire after 400 ms of no typing
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived: apply filter + search
  const allFiltered = useMemo(() => {
    let result = filterStations(STATIONS, filter);
    result = searchStations(result, searchQuery);
    return result;
  }, [filter, searchQuery]);

  // Derived: if user location known, attach distances and sort
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
  };
}
