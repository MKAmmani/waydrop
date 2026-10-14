/**
 * Onboarding endpoints from WAYDROP_API_CONTRACT.md ("Batch 1: Onboarding").
 * Screens only ever import `api` from here. With EXPO_PUBLIC_API_BASE_URL empty,
 * every call goes to the in-app mock; set it and the same calls hit the real server.
 */
import { http, ApiError } from './http';
import { mock } from './mock';

export { ApiError };

export type Tokens = { access_token: string; refresh_token: string };
export type Me = { id: string; phone: string | null; first_name: string | null; last_name: string | null; photo_url: string | null; area_id: string | null; runner_status: 'unverified' | 'pending' | 'verified' | 'rejected' };
export type Area = { id: string; name: string; subtitle: string; lat: number; lng: number };
export type LatLng = { lat: number; lng: number };
export type HomeData = {
  site_id: string;
  balance: number; // kobo
  unread: number;
  runners_nearby: number;
  runners: LatLng[]; // rounded positions, for the map only
  busy_spots: { lat: number; lng: number; count: number; label: string }[];
  send_again: { id: string; item: string; from: string; to: string; price: number }[];
  saved_places: { id: string; label: string; name: string }[];
  earn: { today: number; week: number; week_errands: number; rating: number };
};

export interface Api {
  requestOtp(phone: string): Promise<{ expires_in: number; resend_after: number }>;
  verifyOtp(phone: string, code: string): Promise<Tokens & { is_new_user: boolean; me: Me }>;
  oauth(provider: 'google' | 'apple', id_token: string): Promise<Tokens & { needs_phone: boolean; me: Me }>;
  updateMe(patch: Partial<Pick<Me, 'first_name' | 'last_name' | 'area_id'>>): Promise<Me>;
  uploadPhoto(uri: string): Promise<{ photo_url: string }>;
  nearbyArea(lat: number, lng: number): Promise<{ area: Area | null; runners_active: number }>;
  searchAreas(q: string): Promise<Area[]>;
  registerDevice(push_token: string, platform: 'ios' | 'android' | 'web', locale: string): Promise<void>;
  home(site_id: string, mode: 'request' | 'earn'): Promise<HomeData>;
  quote(site_id: string, from_id: string, to_id: string): Promise<Quote>;
  createTask(t: NewTask): Promise<Task>;
  getTask(id: string): Promise<Task>;
  raiseBounty(id: string, bounty: number): Promise<Task>;
  cancelTask(id: string): Promise<Task>;
}

export type Quote = { distance_m: number; duration_s: number; suggested_min: number; suggested_max: number; fee_rate: number; runners_nearby: number };
export type NewTask = { site_id: string; item: string; note: string; pickup: { id: string; name: string }; dropoff: { id: string; name: string }; bounty: number };
export type Task = {
  id: string; status: 'pending' | 'accepted' | 'cancelled'; item: string; pickup: { id: string; name: string }; dropoff: { id: string; name: string };
  bounty: number; suggested_min: number; pin: string; created_at: number;
  search: { notified: number; viewing: number; no_match: boolean };
  runner: { first_name: string; rating: number; trips: number; eta_s: number } | null;
  balance_after: number;
};

const real: Api = {
  requestOtp: (phone) => http('POST', '/auth/otp/request', { phone }),
  verifyOtp: (phone, code) => http('POST', '/auth/otp/verify', { phone, code }),
  oauth: (provider, id_token) => http('POST', '/auth/oauth', { provider, id_token }),
  updateMe: (patch) => http('PATCH', '/me', patch),
  uploadPhoto: (uri) => http('POST', '/me/photo', { uri }, { multipartFile: uri }),
  nearbyArea: (lat, lng) => http('GET', `/areas/nearby?lat=${lat}&lng=${lng}`),
  searchAreas: (q) => http('GET', `/areas?q=${encodeURIComponent(q)}`),
  registerDevice: (push_token, platform, locale) => http('POST', '/devices', { push_token, platform, locale }),
  home: (site_id, mode) => http('GET', `/home?site=${site_id}&mode=${mode}`),
  quote: (site_id, from_id, to_id) => http('POST', '/quotes', { site_id, pickup: from_id, dropoff: to_id }),
  createTask: (t) => http('POST', '/tasks', t, { idempotent: true }),
  getTask: (id) => http('GET', `/tasks/${id}`),
  raiseBounty: (id, bounty) => http('POST', `/tasks/${id}/bounty`, { bounty }, { idempotent: true }),
  cancelTask: (id) => http('POST', `/tasks/${id}/cancel`, {}, { idempotent: true }),
};

export const usingMock = !process.env.EXPO_PUBLIC_API_BASE_URL;
export const api: Api = usingMock ? mock : real;
