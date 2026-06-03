// src/modules/connect/ConnectPage.tsx
// Drop-in replacement for the existing Connect page.
// Keeps the tab UI structure — only the map/list area is replaced.

import { useState, useCallback, lazy, Suspense } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useStations } from '../../hooks/useStations';
import { FilterType, GeocodeResult } from '../../types/station';
import StationList from './StationList';

// Lazy-load the heavy Leaflet map only when Connect tab is active
const MapView = lazy(() => import('./MapView'));

const FILTER_OPTIONS: { value: FilterType; label: string; emoji: string }[] = [
  { value: 'all',     label: 'All',      emoji: '📍' },
  { value: 'repair',  label: 'Repair',   emoji: '🔧' },
  { value: 'recycle', label: 'Recycle',  emoji: '♻️' },
];

type Tab = 'map' | 'list';

export default function ConnectPage() {
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [focusPoint, setFocusPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { userLocation, status: geoStatus, requestLocation, clearLocation } = useGeolocation();

  const {
    displayedStations,
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
  } = useStations(userLocation?.lat, userLocation?.lng);

  // Handle search input — search local data AND run geocoder
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearchQuery(val);
      runGeocode(val);
      setShowSuggestions(true);
    },
    [setSearchQuery, runGeocode]
  );

  // User picks a geocode suggestion → pan map there, clear search
  const handleSuggestionSelect = useCallback(
    (result: GeocodeResult) => {
      setFocusPoint({ lat: result.lat, lng: result.lng });
      setSearchQuery('');
      clearSuggestions();
      setShowSuggestions(false);
      setActiveTab('map');
    },
    [setSearchQuery, clearSuggestions]
  );

  const handleStationSelect = useCallback(
    (station: typeof displayedStations[0]) => {
      setSelectedStation(station);
      setFocusPoint({ lat: station.lat, lng: station.lng });
      setActiveTab('map');
    },
    [setSelectedStation]
  );

  const geoButtonLabel = {
    idle:        '📍 Use my location',
    pending:     '⏳ Locating…',
    granted:     '✕ Clear location',
    denied:      '🚫 Location denied',
    unavailable: '🚫 Not available',
  }[geoStatus];

  const repairCount  = displayedStations.filter((s) => s.type === 'repair').length;
  const recycleCount = displayedStations.filter((s) => s.type === 'recycle').length;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6">
        <h1 className="text-xl font-bold text-gray-900">Connect</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Find repair shops and e-waste recycling centres near you.
        </p>
      </div>

      {/* ── Controls bar ───────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 space-y-3">

        {/* Search + geocode */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                🔍
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search stations or place name…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                aria-label="Search stations or geocode a location"
                aria-autocomplete="list"
                aria-controls="geocode-suggestions"
              />
              {isGeocoding && (
                <span className="absolute inset-y-0 right-3 flex items-center text-gray-400 text-xs">
                  …
                </span>
              )}
            </div>

            {/* Geolocation button */}
            <button
              onClick={geoStatus === 'granted' ? clearLocation : requestLocation}
              disabled={geoStatus === 'pending' || geoStatus === 'denied' || geoStatus === 'unavailable'}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                geoStatus === 'granted'
                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  : geoStatus === 'denied' || geoStatus === 'unavailable'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
              aria-label="Use my current location to find nearby stations"
            >
              {geoButtonLabel}
            </button>
          </div>

          {/* Geocode suggestions dropdown */}
          {showSuggestions && geocodeSuggestions.length > 0 && (
            <ul
              id="geocode-suggestions"
              role="listbox"
              aria-label="Location suggestions"
              className="absolute z-[9999] top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
            >
              {geocodeSuggestions.map((r, i) => (
                <li
                  key={i}
                  role="option"
                  aria-selected={false}
                  onMouseDown={() => handleSuggestionSelect(r)}
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer truncate"
                >
                  📍 {r.displayName}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium mr-1">Show:</span>
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                filter === opt.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              aria-pressed={filter === opt.value}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}

          {/* Result summary */}
          <span className="ml-auto text-xs text-gray-400">
            {repairCount} repair · {recycleCount} recycle
            {userLocation && ' · sorted by distance'}
          </span>
        </div>

        {/* Geolocation denied warning */}
        {geoStatus === 'denied' && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2" role="alert">
            ⚠️ Location access was denied. Enable it in your browser settings and try again.
          </p>
        )}
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6">
        <nav className="flex gap-0" role="tablist" aria-label="View mode">
          {(['map', 'list'] as Tab[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'map' ? '🗺️ Map' : '📋 List'}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">

        {/* Map tab */}
        <div
          role="tabpanel"
          aria-label="Map view"
          className={`h-full ${activeTab === 'map' ? 'block' : 'hidden'}`}
          style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}
        >
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full text-gray-400 gap-2">
                <span className="animate-spin text-xl">🗺️</span>
                <span className="text-sm">Loading map…</span>
              </div>
            }
          >
            <MapView
              stations={displayedStations}
              userLocation={userLocation}
              focusPoint={focusPoint}
              onStationSelect={handleStationSelect}
            />
          </Suspense>
        </div>

        {/* List tab */}
        <div
          role="tabpanel"
          aria-label="List view"
          className={`h-full overflow-y-auto ${activeTab === 'list' ? 'block' : 'hidden'}`}
        >
          <StationList
            stations={displayedStations}
            selectedStation={selectedStation}
            onSelect={handleStationSelect}
            hasUserLocation={!!userLocation}
          />
        </div>
      </div>
    </div>
  );
}
