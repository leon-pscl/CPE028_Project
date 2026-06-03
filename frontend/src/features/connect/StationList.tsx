import { Station } from '../../types/station';
import { formatDistance } from '../../lib/stationUtils';
import { Wrench, Recycle } from 'lucide-react';

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
      <div className="flex flex-col items-center justify-center h-40 text-muted text-sm gap-2">
        <p>No stations match your search.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-divider" role="list" aria-label="Station list">
      {stations.map((station) => {
        const isSelected = selectedStation?.id === station.id;
        const isRepair = station.type === 'repair';

        return (
          <li key={station.id}>
            <button
              onClick={() => onSelect(station)}
              className={`w-full text-left py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                isSelected
                  ? 'bg-ink/5'
                  : 'hover:bg-canvas'
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-ink truncate">
                    {station.name}
                  </p>
                  <p className="text-xs text-muted mt-0.5 truncate">
                    {station.address}, {station.city}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        isRepair
                          ? 'bg-ink/10 text-ink'
                          : 'bg-ink/10 text-ink'
                      }`}
                    >
                      {isRepair ? <Wrench className="h-3 w-3" aria-hidden="true" /> : <Recycle className="h-3 w-3" aria-hidden="true" />}
                      {isRepair ? 'Repair' : 'Recycle'}
                    </span>

                    {station.verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-ink/5 text-ink">
                        ✓ Verified
                      </span>
                    )}

                    {hasUserLocation && station.distance != null && (
                      <span className="text-xs text-ink font-medium">
                        {formatDistance(station.distance)}
                      </span>
                    )}
                  </div>
                </div>

                {station.rating != null && (
                  <div className="flex-shrink-0 text-right">
                    <span className="text-xs font-semibold text-ink">
                      ★ {station.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {isSelected && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {station.accepts.map((item) => (
                    <span
                      key={item}
                      className="px-2 py-0.5 bg-canvas text-muted text-xs rounded"
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