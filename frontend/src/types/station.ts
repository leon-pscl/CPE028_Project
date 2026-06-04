export type StationType = 'repair' | 'recycle';

export type FilterType = 'all' | 'repair' | 'recycle';

export type StationSource = 'geoapify' | 'supabase' | 'user_submission' | 'corrected';

export interface Station {
  id: string;
  name: string;
  types: StationType[];
  address: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  phone?: string;
  email?: string;
  website?: string;
  accepts: string[];
  verified: boolean;
  rejected?: boolean;
  rating?: number;
  hours?: string;
  distance?: number;
  source: StationSource;
  geoapify_place_id?: string;
  shop_id?: string;
  task_id?: string;
  submitted_by?: string;
  submitted_at?: string;
  contributed_by?: string;
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

export interface AddLocationFormData {
  name: string;
  types: StationType[];
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  hours?: string;
  brands_serviced?: string[];
  accepted_items?: string[];
}
