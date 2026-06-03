import { useState, useCallback, lazy, Suspense } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useStations } from '../../hooks/useStations';
import { FilterType, GeocodeResult } from '../../types/station';
import StationList from './StationList';
import { Search, MapPin, Wrench, Recycle, List, X } from 'lucide-react';

const MapView = lazy(() => import('./MapView'));

const FILTER_OPTIONS: { value: FilterType; label: string; icon: typeof Wrench }[] = [
  { value: 'all',     label: 'All',           icon: MapPin },
  { value: 'repair',  label: 'Repair Centers', icon: Wrench },
  { value: 'recycle', label: 'Recycling Centers', icon: Recycle },
];

export default function ConnectPage() {
  const [focusPoint, setFocusPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const { userLocation, status: geoStatus, requestLocation, clearLocation } = useGeolocation();

  const {
    displayedStations,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    geocodeSuggestions,
    isGeocoding,
    runGeocode,
    clearSuggestions,
    selectedStation,
    setSelectedStation,
  } = useStations(userLocation?.lat, userLocation?.lng);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearchQuery(val);
      runGeocode(val);
      setShowSuggestions(true);
    },
    [setSearchQuery, runGeocode]
  );

  const handleSuggestionSelect = useCallback(
    (result: GeocodeResult) => {
      setFocusPoint({ lat: result.lat, lng: result.lng });
      setSearchQuery('');
      clearSuggestions();
      setShowSuggestions(false);
    },
    [setSearchQuery, clearSuggestions]
  );

  const handleStationSelect = useCallback(
    (station: typeof displayedStations[0]) => {
      setSelectedStation(station);
      setFocusPoint({ lat: station.lat, lng: station.lng });
    },
    [setSelectedStation]
  );

  const repairCount  = displayedStations.filter((s) => s.type === 'repair').length;
  const recycleCount = displayedStations.filter((s) => s.type === 'recycle').length;

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-section-connect">
      {/* Map */}
      <div className="flex-1 relative min-h-0">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full text-muted gap-2">
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

        {/* Map overlay: search + geolocation */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search stations or place name…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-ink rounded-md focus:outline-none focus:ring-2 focus:ring-ink bg-canvas text-ink"
              aria-label="Search stations or geocode a location"
              aria-autocomplete="list"
              aria-controls="geocode-suggestions"
            />
            {isGeocoding && (
              <span className="absolute inset-y-0 right-3 flex items-center text-muted text-xs">…</span>
            )}
            {showSuggestions && geocodeSuggestions.length > 0 && (
              <ul
                id="geocode-suggestions"
                role="listbox"
                aria-label="Location suggestions"
                className="absolute z-[9999] top-full left-0 right-0 mt-1 bg-surface border border-ink rounded-md shadow-lg max-h-48 overflow-y-auto"
              >
                {geocodeSuggestions.map((r, i) => (
                  <li
                    key={i}
                    role="option"
                    aria-selected={false}
                    onMouseDown={() => handleSuggestionSelect(r)}
                    className="px-3 py-2 text-sm text-ink hover:bg-canvas cursor-pointer truncate"
                  >
                    <MapPin className="inline h-3 w-3 mr-1 text-muted" aria-hidden="true" />
                    {r.displayName}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={geoStatus === 'granted' ? clearLocation : requestLocation}
            disabled={geoStatus === 'pending' || geoStatus === 'denied' || geoStatus === 'unavailable'}
            className="shrink-0 px-3 py-2 rounded-md text-sm font-medium bg-canvas border border-ink text-ink hover:bg-surface transition-colors"
            aria-label="Use my current location"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Mobile toggle button */}
        <button
          onClick={() => setMobilePanelOpen(!mobilePanelOpen)}
          className="md:hidden absolute bottom-4 right-4 z-[1000] flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ink text-surface text-sm font-semibold shadow-lg"
          aria-label={mobilePanelOpen ? 'Hide station list' : 'Show station list'}
        >
          {mobilePanelOpen ? <X className="h-4 w-4" /> : <List className="h-4 w-4" />}
          {mobilePanelOpen ? 'Map' : `${displayedStations.length} stations`}
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobilePanelOpen && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-[998] bg-ink/30"
          aria-label="Close station list"
          onClick={() => setMobilePanelOpen(false)}
        />
      )}

      {/* Station panel — sidebar on desktop, bottom sheet on mobile */}
      <aside
        className={`
          bg-canvas border-ink flex flex-col shrink-0
          fixed bottom-0 left-0 right-0 z-[999] max-h-[70vh] rounded-t-2xl shadow-2xl
          transition-transform duration-300 ease-out
          ${mobilePanelOpen ? 'translate-y-0' : 'translate-y-full'}
          md:static md:translate-y-0 md:rounded-none md:shadow-none md:border-l md:max-h-none md:w-80 lg:w-96
        `}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <h1 className="text-xl font-bold text-ink">Connect</h1>
          <p className="text-sm text-muted mt-1">Find repair shops and e-waste recycling centres near you.</p>
        </div>

        {/* Filter chips */}
        <div className="px-6 pb-4 shrink-0">
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = filter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-ink text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-ink text-surface'
                      : 'bg-canvas text-ink hover:bg-surface'
                  }`}
                  aria-pressed={isActive}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">
            {repairCount} repair · {recycleCount} recycle
            {userLocation && ' · sorted by distance'}
          </p>
        </div>

        {/* Station list */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <StationList
            stations={displayedStations}
            selectedStation={selectedStation}
            onSelect={handleStationSelect}
            hasUserLocation={!!userLocation}
          />
        </div>
      </aside>
    </div>
  );
}
