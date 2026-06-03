// src/hooks/useGeolocation.ts

import { useState, useCallback } from 'react';
import { UserLocation } from '../types/station';

type GeolocationStatus = 'idle' | 'pending' | 'granted' | 'denied' | 'unavailable';

interface UseGeolocationReturn {
  userLocation: UserLocation | null;
  status: GeolocationStatus;
  requestLocation: () => void;
  clearLocation: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>('idle');

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      return;
    }

    setStatus('pending');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          granted: true,
        });
        setStatus('granted');
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      { timeout: 10_000, maximumAge: 300_000, enableHighAccuracy: false }
    );
  }, []);

  const clearLocation = useCallback(() => {
    setUserLocation(null);
    setStatus('idle');
  }, []);

  return { userLocation, status, requestLocation, clearLocation };
}
