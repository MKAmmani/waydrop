/**
 * "You only see where you are."
 * A school has one or more sites. The app works out which site you're on from your
 * location and shows only that site. No buttons, no switching. When you walk onto
 * another site, it quietly changes and tells you once.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { BUK_SITES } from '@/data/campuses/buk';
import { useSession } from '@/store/session';

import type { Area } from '@/api';

export type SiteId = string;
export type Site = { id: SiteId; name: string; short: string; center: { lat: number; lng: number }; radiusM: number };

/**
 * Site boundaries as a centre and radius for now. The backend will send real
 * boundary shapes (drawn in Desk → Campus setup); this list only seeds the demo.
 */
export const SITES: Site[] = [
  { id: 'buk-new', name: BUK_SITES.new.name, short: 'New Site', center: { lat: BUK_SITES.new.lat, lng: BUK_SITES.new.lng }, radiusM: 1600 },
  { id: 'buk-old', name: BUK_SITES.old.name, short: 'Old Site', center: { lat: BUK_SITES.old.lat, lng: BUK_SITES.old.lng }, radiusM: 1100 },
];

export function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, t = Math.PI / 180, x = (b.lat - a.lat) * t, y = (b.lng - a.lng) * t;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(y / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Which site contains this point? Null when you're off campus. */
export function siteAt(p: { lat: number; lng: number }): Site | null {
  const hits = SITES.map((s) => ({ s, d: metersBetween(p, s.center) })).filter((x) => x.d <= x.s.radiusM).sort((a, b) => a.d - b.d);
  return hits[0]?.s ?? null;
}

/** Converts user's selected campus area into an active map site */
export function siteFromArea(area?: Area | null, areaId?: string | null): Site {
  if (area) {
    const known = SITES.find((s) => s.id === area.id);
    if (known) return known;
    return {
      id: area.id,
      name: area.name,
      short: area.name.length > 20 ? area.name.slice(0, 18) + '…' : area.name,
      center: { lat: area.lat, lng: area.lng },
      radiusM: 2000,
    };
  }
  if (areaId) {
    const known = SITES.find((s) => s.id === areaId);
    if (known) return known;
  }
  return SITES[0];
}

export type SiteState = {
  site: Site;
  you: { lat: number; lng: number } | null;
  /** 'live' = following your location; 'home' = location off or unavailable, using your saved area. */
  source: 'live' | 'home';
  /** Set once when the site changes while the app is open, so the screen can show a short note. */
  changedTo: Site | null;
  clearChange(): void;
  locationOff: boolean;
};

export function useSite(): SiteState {
  const area = useSession((s) => s.area);
  const areaId = useSession((s) => s.me?.area_id ?? s.area?.id ?? null);
  const [site, setSite] = useState<Site>(() => siteFromArea(area, areaId));
  const [you, setYou] = useState<{ lat: number; lng: number } | null>(null);
  const [source, setSource] = useState<'live' | 'home'>('home');
  const [changedTo, setChangedTo] = useState<Site | null>(null);
  const [locationOff, setLocationOff] = useState(false);
  const current = useRef(site.id);

  useEffect(() => {
    const active = siteFromArea(area, areaId);
    if (active.id !== current.current) {
      current.current = active.id;
      setSite(active);
    }
  }, [area?.id, areaId]);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let alive = true;

    const checkAndStartLocation = async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
        const perm = await Location.getForegroundPermissionsAsync().catch(() => null);

        if (!servicesEnabled || !perm?.granted) {
          if (alive) {
            setLocationOff(true);
            setSource('home');
          }
          if (sub) {
            sub.remove();
            sub = null;
          }
          return;
        }

        if (alive) {
          setLocationOff(false);
        }

        const apply = (lat: number, lng: number) => {
          if (!alive) return;
          setYou({ lat, lng });
          setSource('live');
          if (area || areaId) return;
          const here = siteAt({ lat, lng });
          if (here && here.id !== current.current) {
            current.current = here.id;
            setSite(here);
            setChangedTo(here);
          }
        };

        const first = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (first) apply(first.coords.latitude, first.coords.longitude);
        setChangedTo(null);

        if (!sub) {
          sub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, distanceInterval: 40, timeInterval: 15000 },
            (p) => apply(p.coords.latitude, p.coords.longitude)
          );
        }
      } catch {
        if (alive) setSource('home');
      }
    };

    checkAndStartLocation();

    // Auto-detect when user returns from settings or turns location on/off
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkAndStartLocation();
      }
    });

    return () => {
      alive = false;
      sub?.remove();
      appStateSub.remove();
    };
  }, [area?.id, areaId]);

  return { site, you, source, changedTo, clearChange: () => setChangedTo(null), locationOff };
}
