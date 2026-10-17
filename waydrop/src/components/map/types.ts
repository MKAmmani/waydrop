import type { LatLng } from '@/api';

export type CampusMapProps = {
  center: LatLng;
  you: LatLng | null;
  runners: LatLng[];
  busy: { lat: number; lng: number; count: number; label: string; kind?: string }[];
  routes?: { from: string; to: string; path: LatLng[]; kind?: string }[];
  roads?: { id?: string; name: string; position?: string }[];
  mode: 'request' | 'earn';
  /** Space covered by the bottom sheet and top bar, so the map centres in what's visible. */
  bottomInset?: number;
  topInset?: number;
};
export type CampusMapHandle = { recenter(): void };
