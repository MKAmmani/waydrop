/**
 * BUK (Bayero University Kano) places.
 *
 * HOW TO EDIT: add or change one line per place. Nothing else in the app needs to change.
 * - name:      what students actually call it ("Coke Village"), shown in search and on the map
 * - aka:       other names people type, so search still finds it
 * - site:      new | old | akth | near (just outside campus, e.g. Kabuga) | town
 * - kind:      what it is, used for the icon
 * - lat/lng:   leave empty until someone drops a pin there; the Desk fills them in
 * - confirmed: set to true once someone at BUK checks the name and spot
 *
 * In production this list lives in the backend (Desk → Campus places) and this file
 * only seeds it. Students can also name pins themselves; the Desk approves them.
 */

export type Site = 'new' | 'old' | 'akth' | 'near' | 'town';
export type Kind = 'hostel' | 'faculty' | 'lecture' | 'library' | 'gate' | 'food' | 'market' | 'shop' | 'bank' | 'sports' | 'keke' | 'dropoff' | 'landmark';

export type CampusPlace = {
  id: string;
  name: string;
  aka?: string[];
  site: Site;
  kind: Kind;
  lat?: number;
  lng?: number;
  confirmed: boolean;
  note?: string;
};

export const BUK_SITES = {
  new: { name: 'BUK New Site', subtitle: 'Main campus, Gwarzo Road', lat: 11.98056, lng: 8.47944 },
  // Old Site coordinates are approximate until checked on the ground.
  old: { name: 'BUK Old Site', subtitle: 'BUK Road, by Kabuga gate', lat: 11.9955, lng: 8.5170, approximate: true },
  akth: { name: 'AKTH', subtitle: 'Aminu Kano Teaching Hospital (medical students)' },
} as const;

export const BUK_PLACES: CampusPlace[] = [
  // ── Known from BUK's own information ──
  { id: 'new-main-library', name: 'Main Library', site: 'new', kind: 'library', confirmed: true },
  { id: 'new-agric-library', name: 'Agric Library', site: 'new', kind: 'library', confirmed: true },
  { id: 'new-education-library', name: 'Education Library', site: 'new', kind: 'library', confirmed: true },
  { id: 'new-engineering-library', name: 'Engineering Library', site: 'new', kind: 'library', confirmed: true },
  { id: 'new-law-library', name: 'Law Library', site: 'new', kind: 'library', confirmed: true },
  { id: 'new-sms-library', name: 'Social and Management Sciences Library', aka: ['SMS library'], site: 'new', kind: 'library', confirmed: true },
  { id: 'new-cbn-centre', name: 'CBN Centre of Excellence', site: 'new', kind: 'landmark', confirmed: true, note: 'Includes accommodation; check what students call it' },
  { id: 'old-sciences-library', name: 'Sciences Library', site: 'old', kind: 'library', confirmed: true },
  { id: 'old-new-hall', name: 'New Hall', site: 'old', kind: 'hostel', confirmed: true, note: 'Female hostel' },
  { id: 'old-kabuga-gate', name: 'Kabuga gate', site: 'old', kind: 'gate', confirmed: true },
  { id: 'old-dukawuya-gate', name: 'Dukawuya gate', site: 'old', kind: 'gate', confirmed: true },
  { id: 'akth', name: 'AKTH', aka: ['Aminu Kano Teaching Hospital', 'teaching hospital'], site: 'akth', kind: 'landmark', confirmed: true },

  // ── From the team, site still to confirm ──
  { id: 'coke-village', name: 'Coke Village', aka: ['school market', 'coke'], site: 'new', kind: 'market', confirmed: false, note: 'School market. Confirm which site' },
  { id: 'stadium', name: 'Stadium', aka: ['sports complex'], site: 'new', kind: 'sports', confirmed: false, note: 'Confirm which site and its usual name' },
  { id: 'bank-area', name: 'Bank area', aka: ['banks'], site: 'new', kind: 'bank', confirmed: false, note: 'Confirm which site and which banks' },

  // ── Near campus ──
  { id: 'kabuga', name: 'Kabuga', aka: ['Kabuga junction'], site: 'near', kind: 'landmark', confirmed: true, note: 'Next to the Old Site' },

  // ── Town markets (for scheduled market runs) ──
  { id: 'kantin-kwari', name: 'Kantin Kwari market', aka: ['Kwari', 'Kasuwar Kwari'], site: 'town', kind: 'market', confirmed: true, note: 'Textiles and fabric' },
  { id: 'sabon-gari', name: 'Sabon Gari market', aka: ['Sabon Gari', 'SG market'], site: 'town', kind: 'market', confirmed: true },
  { id: 'singer', name: 'Singer market', aka: ['Singa', 'Kasuwar Singer'], site: 'town', kind: 'market', confirmed: true, note: 'Foodstuff in bulk. Being rebuilt after the 2026 fire: check what is open' },
  { id: 'kurmi', name: 'Kurmi market', aka: ['Kasuwar Kurmi'], site: 'town', kind: 'market', confirmed: true, note: 'Books and traditional goods' },
  { id: 'yankaba', name: 'Yankaba market', aka: ['Yan Kaba'], site: 'town', kind: 'market', confirmed: true, note: 'Vegetables' },

  // ── To fill in: hostels, faculties, lecture halls, food spots, keke parks, drop points ──
  // { id: 'new-hostel-1', name: '', aka: [], site: 'new', kind: 'hostel', confirmed: false },
];

/** Search used by the app: matches name and other names, confirmed places first. */
export function searchBuk(q: string): CampusPlace[] {
  const s = q.trim().toLowerCase();
  const list = s ? BUK_PLACES.filter((p) => [p.name, ...(p.aka ?? [])].some((n) => n.toLowerCase().includes(s))) : BUK_PLACES;
  return [...list].sort((a, b) => Number(b.confirmed) - Number(a.confirmed));
}
