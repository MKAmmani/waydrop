/**
 * Session and onboarding progress.
 * Tokens live in the secure store; everything else is cached in AsyncStorage so the app
 * resumes exactly where someone left onboarding (closed the app on the OTP screen, etc.).
 */
import { create } from 'zustand';
import type { Me, Tokens, Area } from '@/api';
import { plain, secure } from '@/lib/storage';

type Flow = 'signup' | 'login';

type State = {
  hydrated: boolean;
  tokens: Tokens | null;
  me: Me | null;
  seenIntro: boolean;
  flow: Flow;
  /** 10 national digits the user typed, kept so "Change number" refills the field. */
  phoneDigits: string;
  area: Area | null;
  notificationsAsked: boolean;
  firstAction: 'send' | 'earn' | null;
};

type Actions = {
  hydrate(): Promise<void>;
  set(patch: Partial<State>): void;
  signIn(t: Tokens, me: Me): Promise<void>;
  signOut(): Promise<void>;
  resetAll(): Promise<void>;
};

const KEY = 'waydrop.session.v1';
const TOKEN_KEY = 'waydrop.tokens';
const initial: State = { hydrated: false, tokens: null, me: null, seenIntro: false, flow: 'signup', phoneDigits: '', area: null, notificationsAsked: false, firstAction: null };

export const SESSION_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

export const useSession = create<State & Actions>((set, get) => ({
  ...initial,
  async hydrate() {
    try {
      const [raw, tok] = await Promise.all([plain.getItem(KEY), secure.get(TOKEN_KEY)]);
      const saved = raw ? (JSON.parse(raw) as Partial<State>) : {};
      const tokens: Tokens | null = tok ? JSON.parse(tok) : null;

      // Enforce 4-hour session lifetime: If session is expired, purge credentials
      if (tokens) {
        const expiresAt = typeof tokens.expires_at === 'number'
          ? tokens.expires_at
          : (tokens.expires_at ? new Date(tokens.expires_at).getTime() : 0);
        if (expiresAt > 0 && Date.now() >= expiresAt) {
          await secure.del(TOKEN_KEY);
          await plain.removeItem(KEY);
          set({ ...initial, hydrated: true, seenIntro: saved.seenIntro ?? true });
          return;
        }
      }

      set({ ...saved, tokens, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  set(patch) {
    set(patch);
    const { tokens, hydrated, ...rest } = { ...get() } as State & Actions;
    const persistable = { seenIntro: rest.seenIntro, flow: rest.flow, phoneDigits: rest.phoneDigits, me: rest.me, area: rest.area, notificationsAsked: rest.notificationsAsked, firstAction: rest.firstAction };
    plain.setItem(KEY, JSON.stringify(persistable)).catch(() => {});
  },
  async signIn(t, me) {
    const expires_at = typeof t.expires_at === 'number'
      ? t.expires_at
      : (t.expires_at ? new Date(t.expires_at).getTime() : Date.now() + SESSION_DURATION_MS);
    const tokensWithExpiry: Tokens = {
      ...t,
      expires_at,
      expires_in: 14400,
    };
    await secure.set(TOKEN_KEY, JSON.stringify(tokensWithExpiry));
    get().set({ tokens: tokensWithExpiry, me });
  },
  async signOut() {
    await secure.del(TOKEN_KEY);
    await plain.removeItem(KEY);
    set({ ...initial, hydrated: true, seenIntro: true });
  },
  async resetAll() {
    await secure.del(TOKEN_KEY);
    await plain.removeItem(KEY);
    set({ ...initial, hydrated: true, seenIntro: false });
  },
}));

/** Used by the HTTP client outside React. */
export const getAccessToken = () => useSession.getState().tokens?.access_token ?? null;

/** Check if session has expired past the 4-hour limit */
export function isSessionExpired(s: State): boolean {
  if (!s.tokens?.access_token) return true;
  if (!s.tokens.expires_at) return false;
  const expiresAt = typeof s.tokens.expires_at === 'number'
    ? s.tokens.expires_at
    : new Date(s.tokens.expires_at).getTime();
  return Date.now() >= expiresAt;
}

/** Helper to verify if session has active auth tokens, user and has not expired */
export function isAuthenticated(s: State): boolean {
  if (!s.tokens?.access_token || !s.me?.id) return false;
  if (isSessionExpired(s)) return false;
  return true;
}

/** Helper to verify if user has runner authorization */
export function isAuthorizedRunner(s: State): boolean {
  return Boolean(s.me && (s.me.runner_status === 'verified' || s.me.role === 'runner'));
}

/** Helper to verify if user completed full onboarding */
export function isFullyOnboarded(s: State): boolean {
  return Boolean(s.tokens?.access_token && s.me?.id && s.me?.first_name && s.me?.area_id);
}

/**
 * Where should this person be right now? One place decides, so deep links,
 * app restarts and back-navigation all agree.
 */
export function nextOnboardingRoute(s: State): string {
  if (!s.seenIntro) return '/intro';
  if (!s.tokens) return '/welcome';
  if (!s.me?.phone) return '/phone';
  if (!s.me?.first_name) return '/profile';
  if (!s.me?.area_id) return '/location';
  if (s.flow === 'login') return '/home';
  if (!s.notificationsAsked) return '/notifications';
  if (!s.firstAction) return '/ready';
  return '/home';
}
