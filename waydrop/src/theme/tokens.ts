/**
 * Waydrop design tokens. Same values as the batch 0 design system.
 * Components read from here; no raw hex values inside screens.
 */
import { Easing } from 'react-native-reanimated';

export const color = {
  // Surfaces
  paper: '#F8FAFC',
  card: '#FFFFFF',
  sunken: '#F1F5F9',
  line: '#E2E8F0',
  lineSoft: '#EEF2F6',
  grid: '#E6ECF2',

  // Ink
  midnight: '#0F172A',
  ink2: '#475569',
  ink3: '#64748B',
  ink4: '#94A3B8',
  white: '#FFFFFF',

  // Direction: routes, pickups, focus, hero fields
  tangerine: '#FF5500',
  tangerineDeep: '#E84A00',
  tangerineInk: '#C63D00',
  tangerineSoft: '#FFF1E9',
  tangerineEdge: '#FFD9C4',

  // Money and success
  mint: '#10B981',
  mintInk: '#047857',
  mintSoft: '#E7F8F1',

  // Errors
  rose: '#E11D48',
  roseInk: '#BE123C',
  roseSoft: '#FFE4E9',

  // Ratings, held money, sticky notes
  butter: '#FFC94A',
  butterSoft: '#FFF6DA',
  butterNote: '#FFE18A',

  // Mascots and notes only
  lilac: '#B9A6FF',
  lilacNote: '#E4DAFF',
  peach: '#FF9A62',
} as const;

export const font = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemi: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
  hand: 'Caveat_600SemiBold',
} as const;

/** Type scale. Display sizes cap their font scaling so huge system text can't break layouts. */
export const type = {
  display: { fontFamily: font.display, fontSize: 40, lineHeight: 42, letterSpacing: -1.2, maxScale: 1.25 },
  h1: { fontFamily: font.display, fontSize: 30, lineHeight: 33, letterSpacing: -0.75, maxScale: 1.3 },
  h2: { fontFamily: font.displayBold, fontSize: 22, lineHeight: 27, letterSpacing: -0.3, maxScale: 1.4 },
  h3: { fontFamily: font.bodySemi, fontSize: 17, lineHeight: 24, letterSpacing: 0, maxScale: 1.6 },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 24, letterSpacing: 0, maxScale: 1.8 },
  label: { fontFamily: font.bodyMedium, fontSize: 14, lineHeight: 20, letterSpacing: 0, maxScale: 1.8 },
  caption: { fontFamily: font.body, fontSize: 13, lineHeight: 18, letterSpacing: 0, maxScale: 1.8 },
  number: { fontFamily: font.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.5, maxScale: 1.3 },
  note: { fontFamily: font.hand, fontSize: 22, lineHeight: 24, letterSpacing: 0, maxScale: 1.4 },
} as const;
export type TypeVariant = keyof typeof type;

/** 4/8 spacing rhythm. */
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const shadow = {
  1: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  2: { shadowColor: '#0F172A', shadowOpacity: 0.1, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  /** For paper props sitting on the tangerine field: warmer, deeper. */
  prop: { shadowColor: '#7A2400', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
} as const;

/** Motion tokens from the blueprint, tuned in batch 0. */
export const motion = {
  sheet: { damping: 15, stiffness: 120, mass: 0.8 },
  press: { inScale: 0.97, inMs: 100, out: { damping: 10, stiffness: 200, mass: 1 } },
  switch: { damping: 18, stiffness: 150, mass: 1 },
  /** Props landing on the page: a little bounce, settles fast. */
  prop: { damping: 13, stiffness: 140, mass: 0.9 },
  screenMs: 250,
  stagger: 60,
  easeOut: Easing.bezier(0.23, 1, 0.32, 1),
  easeInOut: Easing.bezier(0.77, 0, 0.175, 1),
} as const;

export const touch = { min: 48 } as const;
