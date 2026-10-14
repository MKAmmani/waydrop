/**
 * Finds the place someone typed, but only on the site they're on (plus near-campus
 * and town markets). Matches official names and the other names students use.
 */
import { BUK_PLACES, type CampusPlace } from '@/data/campuses/buk';
import type { SiteId } from '@/lib/sites';

export type PickedPlace = Pick<CampusPlace, 'id' | 'name' | 'kind'> & { lat?: number; lng?: number };
export const HERE: PickedPlace = { id: 'here', name: 'Your location', kind: 'landmark' };

const siteCode = (id: SiteId) => (id === 'buk-old' ? 'old' : 'new');

/** Places visible from this site: its own places, plus near-campus spots and town markets. */
export function placesFor(siteId: SiteId): CampusPlace[] {
  const code = siteCode(siteId);
  return BUK_PLACES.filter((p) => p.site === code || p.site === 'town' || (code === 'old' && p.site === 'near'));
}

export function searchPlaces(siteId: SiteId, q: string): CampusPlace[] {
  const s = q.trim().toLowerCase();
  const list = placesFor(siteId);
  if (!s) return list;
  return list.filter((p) => [p.name, ...(p.aka ?? [])].some((n) => n.toLowerCase().includes(s) || (s.length > 3 && s.includes(n.toLowerCase()))));
}

export function resolvePlace(siteId: SiteId, query: string, hostel?: string | null): PickedPlace | null {
  const s = query.trim().toLowerCase();
  if (!s) return null;
  if (/^(here|me|my location|where i am)$/.test(s)) return HERE;
  if (/^(my )?(hostel|room|hall)$/.test(s) && hostel) return { id: 'hostel', name: hostel, kind: 'hostel' };
  return searchPlaces(siteId, s)[0] ?? null;
}
