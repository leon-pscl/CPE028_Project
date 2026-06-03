// src/modules/connect/StationList.tsx

import { Station } from '../../types/station';
import { formatDistance } from '../../lib/stationUtils';

interface StationListProps {
  stations: Station[];
  selectedStation: Station | null;
  onSelect: (station: Station) => void;
  hasUserLocation: boolean;
}

export default function StationList({
  stations,
  selectedStation,
  onSelect,
  hasUserLocation,
}: StationListProps) {
  if (stations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm gap-2">
        <span className="text-2xl">🔍</span>
        <p>No stations match your search.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100" role="list" aria-label="Station list">
      {stations.map((station) => {
        const isSelected = selectedStation?.id === station.id;
        const isRepair = station.type === 'repair';

        return (
          <li key={station.id}>
            <button
              onClick={() => onSelect(station)}
              className={`w-full text-left px-4 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isSelected
                  ? 'bg-blue-50 border-l-4 border-blue-500'
                  : 'hover:bg-gray-50 border-l-4 border-transparent'
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {station.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {station.address}, {station.city}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* Type badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        isRepair
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {isRepair ? '🔧' : '♻️'} {isRepair ? 'Repair' : 'Recycle'}
                    </span>

                    {/* Verified badge */}
                    {station.verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        ✓ Verified
                      </span>
                    )}

                    {/* Distance */}
                    {hasUserLocation && station.distance != null && (
                      <span className="text-xs text-orange-600 font-medium">
                        📍 {formatDistance(station.distance)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Rating */}
                {station.rating != null && (
                  <div className="flex-shrink-0 text-right">
                    <span className="text-xs font-semibold text-amber-600">
                      ★ {station.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {/* Accepts pills */}
              {isSelected && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {station.accepts.map((item) => (
                    <span
                      key={item}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
