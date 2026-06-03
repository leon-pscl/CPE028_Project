import { Station } from '../../types/station';
import { formatDistance } from '../../lib/stationUtils';
import { Wrench, Recycle } from 'lucide-react';

interface StationListProps {
  stations: Station[];
  selectedStation: Station | null;
  onSelect: (station: Station) => void;
  hasUserLocation: boolean;
  isLoading?: boolean;
}

function StationSkeleton() {
  return (
    <li className="py-3 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-ink/10 rounded w-3/4" />
          <div className="h-3 bg-ink/10 rounded w-full" />
          <div className="flex gap-2">
            <div className="h-5 bg-ink/10 rounded-full w-16" />
            <div className="h-5 bg-ink/10 rounded-full w-20" />
          </div>
        </div>
        <div className="h-4 bg-ink/10 rounded w-8" />
      </div>
    </li>
  );
}

export default function StationList({
  stations,
  selectedStation,
  onSelect,
  hasUserLocation,
  isLoading,
}: StationListProps) {
  if (isLoading) {
    return (
      <ul className="divide-y divide-divider" role="list" aria-label="Station list">
        {Array.from({ length: 5 }).map((_, i) => (
          <StationSkeleton key={i} />
        ))}
      </ul>
    );
  }

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
        const isRepair = station.types.includes('repair');
        const isRecycle = station.types.includes('recycle');

        return (
          <li key={station.id}>
            <button
              onClick={() => onSelect(station)}
              className={`w-full text-left py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                isSelected ? 'bg-ink/5' : 'hover:bg-canvas'
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-ink truncate">
                    {station.name}
                  </p>
                  <p className="text-xs text-muted mt-0.5 truncate">
                    {station.address}
                    {station.city ? `, ${station.city}` : ''}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {isRepair && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-ink/10 text-ink">
                        <Wrench className="h-3 w-3" aria-hidden="true" />
                        Repair
                      </span>
                    )}
                    {isRecycle && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-ink/10 text-ink">
                        <Recycle className="h-3 w-3" aria-hidden="true" />
                        Recycle
                      </span>
                    )}

                    {station.verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-ink/5 text-ink">
                        ✓ Verified
                      </span>
                    )}

                    {station.rejected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                        Rejected
                      </span>
                    )}
                    {station.source === 'user_submission' && !station.rejected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        Community
                      </span>
                    )}

                    {hasUserLocation && station.distance != null && (
                      <span className="text-xs text-ink font-medium">
                        {formatDistance(station.distance)}
                      </span>
                    )}
                  </div>

                  {station.contributed_by && (
                    <p className="text-[10px] text-muted mt-1">
                      Added by {station.contributed_by}
                      {station.submitted_at ? ` on ${new Date(station.submitted_at).toLocaleDateString()}` : ''}
                    </p>
                  )}
                </div>

                {station.rating != null && (
                  <div className="flex-shrink-0 text-right">
                    <span className="text-xs font-semibold text-ink">
                      ★ {station.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {isSelected && station.accepts && station.accepts.length > 0 && (
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
