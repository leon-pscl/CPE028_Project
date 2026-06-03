// src/types/station.ts

export type StationType = 'repair' | 'recycle';

export type FilterType = 'all' | 'repair' | 'recycle';

export interface Station {
  id: string;
  name: string;
  type: StationType;
  address: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  phone?: string;
  email?: string;
  website?: string;
  accepts: string[];       // e.g. ["smartphones", "laptops", "tablets"]
  verified: boolean;
  rating?: number;
  hours?: string;
  distance?: number;       // km — computed client-side when user location is known
}

export interface UserLocation {
  lat: number;
  lng: number;
  granted: boolean;
}

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
}
