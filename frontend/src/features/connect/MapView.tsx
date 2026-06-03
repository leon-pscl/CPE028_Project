// src/features/connect/MapView.tsx
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Station, UserLocation } from '../../types/station';
import { formatDistance } from '../../lib/stationUtils';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PH_BOUNDS = L.latLngBounds(L.latLng(4.5, 116.0), L.latLng(21.5, 127.0));
const PH_CENTER: L.LatLngExpression = [12.8797, 121.774];

function makeIcon(type: 'repair' | 'recycle', size = 32): L.DivIcon {
  const colors = {
    repair:  { bg: '#2563eb', border: '#1d4ed8', emoji: '🔧' },
    recycle: { bg: '#16a34a', border: '#15803d', emoji: '♻️' },
  };
  const c = colors[type];
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
        <span style="transform:rotate(45deg); font-size:${size * 0.45}px; line-height:1;">
          ${c.emoji}
        </span>
      </div>`,
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

interface MapViewProps {
  stations: Station[];
  userLocation: UserLocation | null;
  focusPoint?: { lat: number; lng: number } | null;
  onStationSelect: (station: Station) => void;
}

export default function MapView({ stations, userLocation, focusPoint, onStationSelect }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

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

    stations.forEach((station) => {
      const marker = L.marker([station.lat, station.lng], { icon: makeIcon(station.type) });

      const distanceLine = station.distance != null
        ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">📍 ${formatDistance(station.distance)} away</p>`
        : '';

      const acceptsList = station.accepts
        .map((a) => `<span style="display:inline-block;padding:2px 6px;margin:2px;background:#f3f4f6;border-radius:4px;font-size:11px;">${a}</span>`)
        .join('');

      const verifiedBadge = station.verified
        ? `<span style="display:inline-block;padding:1px 6px;background:#dcfce7;color:#166534;border-radius:9999px;font-size:11px;font-weight:600;">✓ Verified</span>`
        : `<span style="display:inline-block;padding:1px 6px;background:#fef3c7;color:#92400e;border-radius:9999px;font-size:11px;">Unverified</span>`;

      const categoryLabel = station.type === 'repair'
        ? '<span style="color:#2563eb;font-weight:600;">🔧 Repair</span>'
        : '<span style="color:#16a34a;font-weight:600;">♻️ Recycle</span>';

      marker.bindPopup(`
        <div style="min-width:220px;font-family:system-ui,sans-serif;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <strong style="font-size:14px;line-height:1.3;">${station.name}</strong>
            ${verifiedBadge}
          </div>
          <p style="margin:2px 0;font-size:12px;color:#374151;">${categoryLabel}</p>
          <p style="margin:4px 0;font-size:12px;color:#4b5563;">📍 ${station.address}, ${station.city}</p>
          ${station.phone ? `<p style="margin:4px 0;font-size:12px;">📞 <a href="tel:${station.phone}">${station.phone}</a></p>` : ''}
          ${station.hours ? `<p style="margin:4px 0;font-size:12px;color:#6b7280;">🕐 ${station.hours}</p>` : ''}
          ${distanceLine}
          <div style="margin-top:8px;">${acceptsList}</div>
          <div style="margin-top:10px;">
            <a href="https://www.openstreetmap.org/directions?from=&to=${station.lat},${station.lng}"
              target="_blank" rel="noopener noreferrer"
              style="display:block;text-align:center;padding:5px 0;background:#2563eb;color:white;border-radius:6px;font-size:12px;text-decoration:none;">
              Get Directions
            </a>
          </div>
        </div>
      `, { maxWidth: 280 });

      marker.on('click', () => onStationSelect(station));
      group.addLayer(marker);
    });
  }, [stations, onStationSelect]);

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

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '480px' }}
      aria-label="Interactive map of repair and recycling stations in the Philippines"
      role="application"
    />
  );
}