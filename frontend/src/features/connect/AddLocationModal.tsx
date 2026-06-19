import { useState, useRef, useEffect } from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/database';
import { geocodeAutocomplete, reverseGeocode } from '../../lib/geoapify';
import { GeocodeResult, StationType } from '../../types/station';
import {
  sanitizeStationName,
  sanitizeAddress,
  sanitizePhone,
  sanitizeUrl,
  validateRequired,
  validateLength,
  validateCoordinates,
} from '../../lib/sanitize';

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialLat?: number;
  initialLng?: number;
}

export default function AddLocationModal({ isOpen, onClose, onSuccess, initialLat, initialLng }: AddLocationModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<StationType[]>(['repair']);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [hours, setHours] = useState('');
  const [brands, setBrands] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialCoords = useRef(false);

  const toggleType = (t: StationType) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  useEffect(() => {
    if (isOpen) {
      setName('');
      setSelectedTypes(['repair']);
      setPhone('');
      setWebsite('');
      setHours('');
      setBrands('');
      setSuggestions([]);
      setShowSuggestions(false);
      setError(null);
      setSuccess(false);
      setIsSubmitting(false);
      hasInitialCoords.current = false;

      if (initialLat !== undefined && initialLng !== undefined) {
        setLatitude(initialLat);
        setLongitude(initialLng);
        setIsResolving(true);
        hasInitialCoords.current = true;

        reverseGeocode(initialLat, initialLng).then((addr) => {
          setAddress(addr || `${initialLat.toFixed(4)}, ${initialLng.toFixed(4)}`);
          setIsResolving(false);
        });
      } else {
        setAddress('');
        setLatitude(null);
        setLongitude(null);
      }
    }
  }, [isOpen, initialLat, initialLng]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAddress(val);

    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);

    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    geocodeTimer.current = setTimeout(async () => {
      const results = await geocodeAutocomplete(val);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 400);
  };

  const handleSuggestionSelect = (result: GeocodeResult) => {
    setAddress(result.displayName);
    setLatitude(result.lat);
    setLongitude(result.lng);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to submit a location.');
      return;
    }

    const errName = validateRequired(name, 'Name') || validateLength(name, 'Name', 200);
    if (errName) { setError(errName); return; }
    if (selectedTypes.length === 0) { setError('Select at least one service type.'); return; }

    const errAddr = validateRequired(address, 'Address') || validateLength(address, 'Address', 500);
    if (errAddr) { setError(errAddr); return; }

    const errCoords = validateCoordinates(latitude, longitude);
    if (errCoords) { setError(errCoords); return; }

    setIsSubmitting(true);
    setError(null);

    const { error: submitError } = await db.directory.submitLocation(user.id, {
      name: sanitizeStationName(name),
      types: selectedTypes,
      address: sanitizeAddress(address),
      latitude: latitude!,
      longitude: longitude!,
      phone: phone.trim() ? sanitizePhone(phone) : undefined,
      website: website.trim() ? sanitizeUrl(website) || undefined : undefined,
      hours: hours.trim().slice(0, 200) || undefined,
      brands_serviced: brands.trim()
        ? brands.split(',').map((b) => b.trim()).filter(Boolean).slice(0, 20)
        : undefined,
    }, user.role);

    setIsSubmitting(false);

    if (submitError) {
      setError(submitError.message || 'Failed to submit location.');
      return;
    }

    setSuccess(true);
    onSuccess();
    setTimeout(() => onClose(), 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink/50">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-divider">
          <h2 className="text-lg font-bold text-ink">Add a Location</h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-ink rounded" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-12 text-center">
            <div className="text-xl mb-2">✓</div>
            <p className="text-sm text-ink font-medium">Location added!</p>
            <p className="text-xs text-muted mt-1">It's now visible on the map with an amber marker.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. TechFix Manila"
                className="w-full px-3 py-2 text-sm border border-ink/20 rounded-md focus:outline-none focus:ring-2 focus:ring-ink bg-canvas text-ink"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Services *</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 px-4 py-2 border border-ink/20 rounded-md cursor-pointer has-[:checked]:bg-ink has-[:checked]:text-surface">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes('repair')}
                    onChange={() => toggleType('repair')}
                    className="sr-only"
                  />
                  <span>🔧 Repair</span>
                </label>
                <label className="flex items-center gap-2 px-4 py-2 border border-ink/20 rounded-md cursor-pointer has-[:checked]:bg-ink has-[:checked]:text-surface">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes('recycle')}
                    onChange={() => toggleType('recycle')}
                    className="sr-only"
                  />
                  <span>♻️ Recycle</span>
                </label>
              </div>
              {selectedTypes.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Select at least one service type.</p>
              )}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-ink mb-1">Address *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  type="text"
                  value={address}
                  onChange={handleAddressChange}
                  onFocus={() => setShowSuggestions(suggestions.length > 0)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Start typing an address…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-ink/20 rounded-md focus:outline-none focus:ring-2 focus:ring-ink bg-canvas text-ink"
                  required
                />
                {isResolving && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted" />
                )}
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-ink/20 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((r, i) => (
                    <li
                      key={i}
                      onMouseDown={() => handleSuggestionSelect(r)}
                      className="px-3 py-2 text-sm text-ink hover:bg-canvas cursor-pointer truncate"
                    >
                      <MapPin className="inline h-3 w-3 mr-1 text-muted" />
                      {r.displayName}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {hasInitialCoords.current && (
              <p className="text-xs text-muted">
                Coordinates: {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+63 2 1234 5678"
                  className="w-full px-3 py-2 text-sm border border-ink/20 rounded-md focus:outline-none focus:ring-2 focus:ring-ink bg-canvas text-ink"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://…"
                  className="w-full px-3 py-2 text-sm border border-ink/20 rounded-md focus:outline-none focus:ring-2 focus:ring-ink bg-canvas text-ink"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Hours</label>
              <input
                type="text"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. Mon–Sat 9AM–7PM"
                className="w-full px-3 py-2 text-sm border border-ink/20 rounded-md focus:outline-none focus:ring-2 focus:ring-ink bg-canvas text-ink"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Brands / Items Accepted
              </label>
              <input
                type="text"
                value={brands}
                onChange={(e) => setBrands(e.target.value)}
                placeholder={'smartphones, laptops, batteries, cables'}
                className="w-full px-3 py-2 text-sm border border-ink/20 rounded-md focus:outline-none focus:ring-2 focus:ring-ink bg-canvas text-ink"
              />
              <p className="text-xs text-muted mt-1">Comma-separated list</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm border border-ink/20 rounded-md text-ink hover:bg-canvas"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-sm bg-ink text-surface rounded-md font-medium hover:bg-ink/80 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
