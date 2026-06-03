import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Station, UserLocation } from '../../types/station';
import { formatDistance } from '../../lib/stationUtils';
import { getPlaceDetails } from '../../lib/geoapify';
import { escapeHtml } from '../../lib/sanitize';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PH_BOUNDS = L.latLngBounds(L.latLng(4.5, 116.0), L.latLng(21.5, 127.0));
const PH_CENTER: L.LatLngExpression = [12.8797, 121.774];

function markerStyle(types: string[]): { bg: string; border: string; emoji: string; label: string } {
  const isRepair = types.includes('repair');
  const isRecycle = types.includes('recycle');
  if (isRepair && isRecycle) return { bg: '#7c3aed', border: '#5b21b6', emoji: '🔧♻️', label: 'Repair & Recycle' };
  if (isRepair) return { bg: '#2563eb', border: '#1d4ed8', emoji: '🔧', label: 'Repair' };
  return { bg: '#16a34a', border: '#15803d', emoji: '♻️', label: 'Recycle' };
}

function makeIcon(types: string[], size = 32): L.DivIcon {
  const c = markerStyle(types);
  return L.divIcon({
    className: '',
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 8)],
    html: `
      <div style="
        width:${size}px; height:${size}px;
        background:${c.bg}; border:2px solid ${c.border};
        border-radius:50% 50% 50% 0; transform:rotate(-45deg);
        box-shadow:0 2px 6px rgba(0,0,0,.35);
        display:flex; align-items:center; justify-content:center;
      ">
        <span style="transform:rotate(45deg); font-size:${size * 0.35}px; line-height:1;">
          ${c.emoji}
        </span>
      </div>`,
  });
}

function makeUserSubmissionIcon(types: string[], size = 32): L.DivIcon {
  const c = markerStyle(types);
  return L.divIcon({
    className: '',
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 8)],
    html: `
      <div style="
        width:${size}px; height:${size}px;
        background:${c.bg}; border:2px solid #92400e;
        border-radius:50% 50% 50% 0; transform:rotate(-45deg);
        box-shadow:0 2px 6px rgba(0,0,0,.35);
        display:flex; align-items:center; justify-content:center;
        position:relative;
      ">
        <span style="transform:rotate(45deg); font-size:${size * 0.35}px; line-height:1;">
          ${c.emoji}
        </span>
      </div>`,
  });
}

function makePinIcon(size = 36): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
    html: `
      <div style="
        width:${size}px; height:${size}px;
        background:#ef4444; border:3px solid white;
        border-radius:50%;
        box-shadow:0 2px 8px rgba(0,0,0,.4);
        display:flex; align-items:center; justify-content:center;
        font-size:${size * 0.5}px; color:white; font-weight:bold;
      ">📍</div>`,
  });
}

function makeUserIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="
      width:20px;height:20px;
      background:#f97316;border:3px solid white;
      border-radius:50%;box-shadow:0 0 0 3px rgba(249,115,22,.4);
    "></div>`,
  });
}

function buildPopupContent(station: Station, showAdminActions: boolean = false): string {
  const safeName = escapeHtml(station.name);
  const safeAddress = escapeHtml(station.address);
  const safeCity = station.city ? escapeHtml(station.city) : '';
  const safePhone = station.phone ? escapeHtml(station.phone) : '';
  const safeHours = station.hours ? escapeHtml(station.hours) : '';
  const safeContributor = station.contributed_by ? escapeHtml(station.contributed_by) : '';

  const distanceLine = station.distance != null
    ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">📍 ${formatDistance(station.distance)} away</p>`
    : '';

  const acceptsList = station.accepts?.length
    ? station.accepts
        .map((a) => `<span style="display:inline-block;padding:2px 6px;margin:2px;background:#f3f4f6;border-radius:4px;font-size:11px;">${escapeHtml(a)}</span>`)
        .join('')
    : '';

  const verifiedBadge = station.verified
    ? `<span style="display:inline-block;padding:1px 6px;background:#dcfce7;color:#166534;border-radius:9999px;font-size:11px;font-weight:600;">✓ Verified</span>`
    : station.rejected
      ? `<span style="display:inline-block;padding:1px 6px;background:#fecaca;color:#991b1b;border-radius:9999px;font-size:11px;">Rejected</span>`
      : `<span style="display:inline-block;padding:1px 6px;background:#fef3c7;color:#92400e;border-radius:9999px;font-size:11px;">Unverified</span>`;

  const isRepair = station.types.includes('repair');
  const isRecycle = station.types.includes('recycle');
  const categoryLabel = isRepair && isRecycle
    ? '<span style="color:#7c3aed;font-weight:600;">🔧♻️ Repair & Recycle</span>'
    : isRepair
      ? '<span style="color:#2563eb;font-weight:600;">🔧 Repair</span>'
      : '<span style="color:#16a34a;font-weight:600;">♻️ Recycle</span>';

  const contributorLine = safeContributor
    ? `<p style="margin:4px 0 0;font-size:10px;color:#9ca3af;">Added by ${safeContributor}${station.submitted_at ? ` on ${new Date(station.submitted_at).toLocaleDateString()}` : ''}</p>`
    : '';

  const adminActions = showAdminActions && station.task_id && !station.rejected
    ? `<div style="margin-top:10px;display:flex;gap:8px;">
        <button data-action="approve" data-station-id="${station.id}"
          style="flex:1;padding:5px 0;background:#16a34a;color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer;">
          ✓ Approve
        </button>
        <button data-action="reject" data-station-id="${station.id}"
          style="flex:1;padding:5px 0;background:#dc2626;color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer;">
          ✕ Reject
        </button>
      </div>`
    : '';

  const directionsLink = station.source !== 'user_submission'
    ? `<div style="margin-top:10px;">
        <a href="https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}"
          target="_blank" rel="noopener noreferrer"
          style="display:block;text-align:center;padding:5px 0;background:#2563eb;color:white;border-radius:6px;font-size:12px;text-decoration:none;">
          Get Directions
        </a>
      </div>`
    : '';

  return `
    <div style="min-width:220px;font-family:system-ui,sans-serif;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
        <strong style="font-size:14px;line-height:1.3;">${safeName}</strong>
        ${verifiedBadge}
      </div>
      <p style="margin:2px 0;font-size:12px;color:#374151;">${categoryLabel}</p>
      <p style="margin:4px 0;font-size:12px;color:#4b5563;">📍 ${safeAddress}${safeCity ? `, ${safeCity}` : ''}</p>
      ${safePhone ? `<p style="margin:4px 0;font-size:12px;">📞 <a href="tel:${safePhone}">${safePhone}</a></p>` : ''}
      ${safeHours ? `<p style="margin:4px 0;font-size:12px;color:#6b7280;">🕐 ${safeHours}</p>` : ''}
      ${distanceLine}
      ${contributorLine}
      ${acceptsList ? `<div style="margin-top:8px;">${acceptsList}</div>` : ''}
      ${adminActions}
      ${directionsLink}
    </div>
  `;
}

interface MapViewProps {
  stations: Station[];
  userLocation: UserLocation | null;
  focusPoint?: { lat: number; lng: number } | null;
  onStationSelect: (station: Station) => void;
  pinningMode?: boolean;
  pendingPin?: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
  currentUserRole?: string;
  onApprove?: (taskId: string) => Promise<void>;
  onReject?: (taskId: string) => Promise<void>;
}

export default function MapView({ stations, userLocation, focusPoint, onStationSelect, pinningMode, pendingPin, onMapClick, currentUserRole, onApprove, onReject }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);
  const detailCache = useRef<Map<string, { phone?: string; hours?: string; website?: string }>>(new Map());
  const clickHandlerRef = useRef<L.LeafletEventHandlerFn | null>(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: PH_CENTER,
      zoom: 6,
      minZoom: 5,
      maxZoom: 18,
      maxBounds: PH_BOUNDS,
      maxBoundsViscosity: 0.8,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersRef.current = layerGroup;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const group = markersRef.current;
    if (!group) return;
    group.clearLayers();

    const isAdmin = currentUserRole === 'moderator' || currentUserRole === 'admin';

    stations.forEach((station) => {
      const icon = station.source === 'user_submission'
        ? makeUserSubmissionIcon(station.types)
        : makeIcon(station.types);

      const marker = L.marker([station.lat, station.lng], { icon });

      const showAdminActions = isAdmin && station.source === 'user_submission' && !!station.task_id;
      marker.bindPopup(buildPopupContent(station, showAdminActions), { maxWidth: 280 });

      const handleClick = async () => {
        if (station.source === 'geoapify' && station.geoapify_place_id) {
          const cached = detailCache.current.get(station.geoapify_place_id);
          if (cached) {
            marker.setPopupContent(buildPopupContent({ ...station, ...cached }, showAdminActions));
          } else {
            const details = await getPlaceDetails(station.geoapify_place_id);
            if (details) {
              const enriched = {
                phone: details.phone || station.phone,
                hours: details.opening_hours || station.hours,
                website: details.website || station.website,
              };
              detailCache.current.set(station.geoapify_place_id, enriched);
              marker.setPopupContent(buildPopupContent({ ...station, ...enriched }, showAdminActions));
            }
          }
        }
        onStationSelect(station);
      };

      marker.on('click', handleClick);
      group.addLayer(marker);
    });
  }, [stations, onStationSelect, currentUserRole]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
    if (userLocation?.granted) {
      const marker = L.marker([userLocation.lat, userLocation.lng], { icon: makeUserIcon(), zIndexOffset: 1000 })
        .addTo(map).bindPopup('<strong>Your location</strong>');
      userMarkerRef.current = marker;
      map.setView([userLocation.lat, userLocation.lng], 12);
    }
  }, [userLocation]);

  useEffect(() => {
    if (focusPoint && mapRef.current) {
      mapRef.current.setView([focusPoint.lat, focusPoint.lng], 13);
    }
  }, [focusPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const container = containerRef.current;
    if (container) {
      container.style.cursor = pinningMode ? 'crosshair' : '';
    }

    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
    }

    if (pinningMode && onMapClick) {
      const handler = (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      };
      clickHandlerRef.current = handler as any;
      map.on('click', handler);
    }

    return () => {
      if (clickHandlerRef.current) {
        map.off('click', clickHandlerRef.current);
        clickHandlerRef.current = null;
      }
    };
  }, [pinningMode, onMapClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pinMarkerRef.current) {
      pinMarkerRef.current.remove();
      pinMarkerRef.current = null;
    }

    if (pendingPin) {
      const marker = L.marker([pendingPin.lat, pendingPin.lng], {
        icon: makePinIcon(),
        zIndexOffset: 2000,
      }).addTo(map);
      pinMarkerRef.current = marker;
      map.setView([pendingPin.lat, pendingPin.lng], 15);
    }
  }, [pendingPin]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || (!onApprove && !onReject)) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const action = target.getAttribute('data-action');
      if (!action || (action !== 'approve' && action !== 'reject')) return;

      const stationId = target.getAttribute('data-station-id');
      if (!stationId) return;

      const station = stations.find((s) => s.id === stationId);
      if (!station || !station.task_id) return;

      e.preventDefault();

      if (action === 'approve' && onApprove) {
        onApprove(station.task_id);
      } else if (action === 'reject' && onReject) {
        onReject(station.task_id);
      }
    };

    container.addEventListener('click', handler);
    return () => container.removeEventListener('click', handler);
  }, [stations, onApprove, onReject]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[300px] md:min-h-[480px]"
      aria-label="Interactive map of repair and recycling stations"
      role="application"
    />
  );
}
