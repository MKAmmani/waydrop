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
};

const KEY = 'waydrop.session.v1';
const TOKEN_KEY = 'waydrop.tokens';
const initial: State = { hydrated: false, tokens: null, me: null, seenIntro: false, flow: 'signup', phoneDigits: '', area: null, notificationsAsked: false, firstAction: null };

export const useSession = create<State & Actions>((set, get) => ({
  ...initial,
  async hydrate() {
    try {
      const [raw, tok] = await Promise.all([plain.getItem(KEY), secure.get(TOKEN_KEY)]);
      const saved = raw ? (JSON.parse(raw) as Partial<State>) : {};
      set({ ...saved, tokens: tok ? JSON.parse(tok) : null, hydrated: true });
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
    await secure.set(TOKEN_KEY, JSON.stringify(t));
    get().set({ tokens: t, me });
  },
  async signOut() {
    await secure.del(TOKEN_KEY);
    await plain.removeItem(KEY);
    set({ ...initial, hydrated: true, seenIntro: true });
  },
}));

/** Used by the HTTP client outside React. */
export const getAccessToken = () => useSession.getState().tokens?.access_token ?? null;

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
  if (!s.notificationsAsked) return '/notifications';
  if (!s.firstAction) return '/ready';
  return '/home';
}
