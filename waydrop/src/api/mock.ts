/**
 * In-app mock backend. Same shapes and error codes as the real API, with realistic delays,
 * so screens are built against the contract from day one.
 *
 * Demo rules:
 * - Any 6-digit code works, except 000000 (wrong code) and 999999 (expired code).
 * - The number 803 000 0000 triggers "too many codes sent".
 * - Numbers ending in 1 are treated as returning users.
 */
import { ApiError } from './http';
import type { Api, Area, Me, HomeData, Task } from './index';
import { SITES } from '@/lib/sites';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (base: number) => wait(base + Math.random() * base * 0.6);

import { BUK_SITES } from '@/data/campuses/buk';

/** Launch campus first. BUK places themselves live in src/data/campuses/buk.ts. */
export const AREAS: Area[] = [
  { id: 'buk-new', name: BUK_SITES.new.name, subtitle: BUK_SITES.new.subtitle, lat: BUK_SITES.new.lat, lng: BUK_SITES.new.lng },
  { id: 'buk-old', name: BUK_SITES.old.name, subtitle: BUK_SITES.old.subtitle, lat: BUK_SITES.old.lat, lng: BUK_SITES.old.lng },
  { id: 'unilag', name: 'University of Lagos', subtitle: 'Akoka, Yaba, Lagos', lat: 6.5158, lng: 3.3898 },
  { id: 'oau', name: 'Obafemi Awolowo University', subtitle: 'Ile-Ife, Osun', lat: 7.5185, lng: 4.5263 },
  { id: 'ui', name: 'University of Ibadan', subtitle: 'Ibadan, Oyo', lat: 7.4443, lng: 3.8996 },
  { id: 'abu', name: 'Ahmadu Bello University', subtitle: 'Samaru, Zaria, Kaduna', lat: 11.1514, lng: 7.6543 },
  { id: 'unn', name: 'University of Nigeria', subtitle: 'Nsukka, Enugu', lat: 6.8675, lng: 7.4085 },
  { id: 'cu', name: 'Covenant University', subtitle: 'Ota, Ogun', lat: 6.6718, lng: 3.158 },
  { id: 'unilorin', name: 'University of Ilorin', subtitle: 'Ilorin, Kwara', lat: 8.4799, lng: 4.6739 },
  { id: 'yaba', name: 'Yaba', subtitle: 'Lagos Mainland', lat: 6.5095, lng: 3.3711 },
  { id: 'lekki', name: 'Lekki Phase 1', subtitle: 'Eti-Osa, Lagos', lat: 6.4474, lng: 3.4723 },
  { id: 'wuse', name: 'Wuse 2', subtitle: 'Abuja', lat: 9.0765, lng: 7.4766 },
  { id: 'bodija', name: 'Bodija', subtitle: 'Ibadan, Oyo', lat: 7.4269, lng: 3.9116 },
];

let balance = 485000; // kobo, shared with home()
const tasks = new Map<string, Task & { lo: number }>();
const hash = (str: string) => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

let me: Me = { id: 'u_demo', phone: null, first_name: null, last_name: null, photo_url: null, area_id: null, runner_status: 'unverified' };
const tokens = () => ({ access_token: `mock.${Date.now()}`, refresh_token: `mock-r.${Date.now()}` });

function km(a: number, b: number, c: number, d: number) {
  const R = 6371, t = Math.PI / 180, x = (c - a) * t, y = (d - b) * t;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(y / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const mock: Api = {
  async requestOtp(phone) {
    await jitter(500);
    if (phone.endsWith('8030000000')) throw new ApiError(429, 'TOO_MANY_REQUESTS', 'Too many codes sent to this number. Try again in 10 minutes.');
    return { expires_in: 300, resend_after: 30 };
  },
  async verifyOtp(phone, code) {
    await jitter(450);
    if (code === '000000') throw new ApiError(422, 'INVALID_CODE', "That code isn't right. Check your texts and try again.");
    if (code === '999999') throw new ApiError(410, 'CODE_EXPIRED', "That code has expired. We've sent you a new one.");
    const returning = phone.endsWith('1');
    me = { ...me, phone, ...(returning ? { first_name: 'Adaeze', last_name: 'Okafor', area_id: 'buk-new' } : {}) };
    return { ...tokens(), is_new_user: !returning, me };
  },
  async oauth() {
    await jitter(700);
    me = { ...me, first_name: me.first_name ?? 'Adaeze', last_name: me.last_name ?? 'Okafor' };
    return { ...tokens(), needs_phone: !me.phone, me };
  },
  async updateMe(patch) {
    await jitter(300);
    me = { ...me, ...patch };
    return me;
  },
  async uploadPhoto(uri) {
    await jitter(600);
    me = { ...me, photo_url: uri };
    return { photo_url: uri };
  },
  async nearbyArea(lat, lng) {
    await jitter(900);
    const best = AREAS.map((a) => ({ a, d: km(lat, lng, a.lat, a.lng) })).sort((x, y) => x.d - y.d)[0];
    // Outside every named area Waydrop still works; we just don't have a name for the place.
    if (!best || best.d > 25) return { area: null, runners_active: 4 };
    return { area: best.a, runners_active: 12 + Math.round(30 / Math.max(1, best.d)) };
  },
  async searchAreas(q) {
    await wait(150);
    const s = q.trim().toLowerCase();
    return s ? AREAS.filter((a) => `${a.name} ${a.subtitle}`.toLowerCase().includes(s)) : AREAS;
  },
  async registerDevice() {
    await wait(200);
  },
  async home(site_id, mode) {
    await jitter(350);
    const site = SITES.find((x) => x.id === site_id) ?? SITES[0];
    const { lat, lng } = site.center;
    // Deterministic scatter so the demo map doesn't jump around on every refresh.
    const rnd = (i: number) => { const x = Math.sin(i * 9301 + (site_id === 'buk-old' ? 7 : 3) * 49297) * 233280; return x - Math.floor(x); };
    const spread = site.radiusM / 111000 * 0.7;
    const runners = Array.from({ length: site_id === 'buk-old' ? 11 : 18 }, (_, i) => ({ lat: lat + (rnd(i) - 0.5) * spread * 2, lng: lng + (rnd(i + 50) - 0.5) * spread * 2 }));
    const old = site_id === 'buk-old';
    const data: HomeData = {
      site_id,
      balance,
      unread: 3,
      runners_nearby: runners.length * 2 + 2,
      runners,
      busy_spots: mode === 'earn' ? [
        { lat: lat - spread * 0.05, lng: lng - spread * 0.22, count: 4, label: old ? 'Sciences Library' : 'Main Library' },
        { lat: lat - spread * 0.2, lng: lng + spread * 0.18, count: 3, label: 'Coke Village' },
      ] : [],
      send_again: old
        ? [{ id: 's1', item: 'Lab manual', from: 'New Hall', to: 'Sciences Library', price: 40000 }]
        : [{ id: 's1', item: 'Calculator', from: 'Hostel', to: 'Main Library', price: 50000 }, { id: 's2', item: 'Jollof rice', from: 'Coke Village', to: 'Hostel', price: 60000 }],
      saved_places: old ? [{ id: 'h', label: 'Hostel', name: 'New Hall' }] : [{ id: 'h', label: 'Hostel', name: 'Your hostel' }, { id: 'c', label: 'Class', name: 'Main Library' }],
      earn: { today: 117000, week: 485000, week_errands: 9, rating: 4.9 },
    };
    return data;
  },
  async quote(site_id, from_id, to_id) {
    await jitter(300);
    // Most BUK places don't have map points yet, so distance is a stable estimate per pair.
    const distance_m = from_id === to_id ? 150 : 300 + (hash(from_id + to_id) % 900);
    const lo = Math.max(200, Math.round((150 + distance_m * 0.35) / 50) * 50) * 100;
    return { distance_m, duration_s: Math.round(distance_m / 1.3), suggested_min: lo, suggested_max: lo * 2, fee_rate: 0.1, runners_nearby: 6 + (distance_m % 9) };
  },
  async createTask(t) {
    await jitter(700);
    if (t.bounty > balance) throw new ApiError(402, 'INSUFFICIENT_FUNDS', 'Your wallet is short for this errand. Top up or lower the offer.');
    balance -= t.bounty;
    const q = await mock.quote(t.site_id, t.pickup.id, t.dropoff.id);
    const id = `WD-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const task = { id, status: 'pending' as const, item: t.item, pickup: t.pickup, dropoff: t.dropoff, bounty: t.bounty, suggested_min: q.suggested_min, pin: String(1000 + Math.floor(Math.random() * 9000)), created_at: Date.now(), search: { notified: 0, viewing: 0, no_match: false }, runner: null, balance_after: balance, lo: q.suggested_min };
    tasks.set(id, task);
    return task;
  },
  async getTask(id) {
    await wait(120);
    const t = tasks.get(id);
    if (!t) throw new ApiError(404, 'NOT_FOUND', 'Errand not found.');
    if (t.status !== 'pending') return t;
    // Demo timeline: runners get notified, someone looks, then a match.
    // Offers below the usual range don't get picked up; that shows the "no runner yet" state.
    const s = (Date.now() - t.created_at) / 1000;
    t.search = { notified: s > 1 ? 12 : 0, viewing: s > 4 ? 2 : 0, no_match: t.bounty < t.lo && s > 7 };
    if (t.bounty >= t.lo && s > 8) { t.status = 'accepted'; t.runner = { first_name: 'Musa', rating: 4.9, trips: 87, eta_s: 180 }; }
    return { ...t };
  },
  async raiseBounty(id, bounty) {
    await jitter(400);
    const t = tasks.get(id);
    if (!t) throw new ApiError(404, 'NOT_FOUND', 'Errand not found.');
    const extra = bounty - t.bounty;
    if (extra > balance) throw new ApiError(402, 'INSUFFICIENT_FUNDS', 'Your wallet is short for this raise.');
    balance -= extra; t.bounty = bounty; t.created_at = Date.now(); t.balance_after = balance;
    return { ...t };
  },
  async cancelTask(id) {
    await jitter(400);
    const t = tasks.get(id);
    if (!t) throw new ApiError(404, 'NOT_FOUND', 'Errand not found.');
    if (t.status === 'accepted') throw new ApiError(409, 'ALREADY_ACCEPTED', 'A runner already accepted. Get help from support to cancel now.');
    balance += t.bounty; t.status = 'cancelled'; t.balance_after = balance;
    return { ...t };
  },
};
