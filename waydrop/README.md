# Waydrop app

Errands that ride along your way. React Native with Expo (SDK 57), Expo Router, Reanimated and TypeScript.

**Built so far:** onboarding, from splash to "You're in". The map home comes next.

## Run it

```bash
npm install
npx expo start
```

- **On your phone:** install **Expo Go** and scan the QR code that appears.
- **In a browser:** press `w` in the terminal.
- **Android emulator / iOS simulator:** press `a` or `i`.

The app connects directly to the Waydrop Laravel API backend configured via `EXPO_PUBLIC_API_BASE_URL`.

## The onboarding flow

| Route | Screen |
|---|---|
| `/` | Tangerine splash. First open only; returning users go straight through |
| `/intro` | 3 story slides with paper props (sticky note, map scrap, PIN receipt, earnings card) |
| `/welcome` | Hero with a typing errand bar; phone, Google, Apple (iOS only, official button) |
| `/phone` | Nigerian number, any format (0803…, +234…), validated |
| `/verify` | 6-digit code; SMS autofill and paste work; resend timer |
| `/profile` | First name, optional last name and photo (camera or library) |
| `/location` | Why location helps, then the system prompt |
| `/area` | Detect and confirm the area, or search (also the fallback when location is off) |
| `/notifications` | Why notifications help, then the system prompt |
| `/ready` | "You're in" and the first choice: send or earn |

**Resuming:** `src/store/session.ts → nextOnboardingRoute()` is the one place that decides where someone belongs. Close the app on any step and it reopens there.

## Project layout

```
app/                     screens (Expo Router)
  (onboarding)/          the onboarding screens above
  (app)/home.tsx         placeholder until the map home is built
src/
  theme/tokens.ts        colours, type scale, spacing, radii, motion springs
  components/ui/         Text, Button, PressableScale, Screen, StepHeader, Field, OtpField
  components/art/        logo, mascots, flag, Google mark, paper props
  api/                   index.ts (typed facade), http.ts (real server)
  store/session.ts       session, tokens (secure storage), onboarding progress
  lib/                   phone formatting, haptics, storage, social sign-in
scripts/phone.test.mjs   tests for phone handling: npm test
```

## Adding BUK places

All BUK place names live in one file: `src/data/campuses/buk.ts`. Add one line per place (hostel, gate, food spot, keke park, drop point). Set `confirmed: true` once someone at BUK has checked it. Nothing else in the app needs to change. In production, the same list lives in the Desk under Campus places.

## Switching to the real backend

1. Set `EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com` in `.env`.
2. The same calls now hit the server. Endpoints and shapes are in `src/api/index.ts` and in the contract.

## Google sign-in

1. Create OAuth client IDs (Android, iOS, Web) in Google Cloud and put them in `.env` (see `.env.example`).
2. In `app/(onboarding)/welcome.tsx`, use `Google.useIdTokenAuthRequest` from `expo-auth-session/providers/google` and send the ID token to `api.oauth('google', token)`.



## Before release

- **Push notifications:** run `eas init` so `getExpoPushTokenAsync` has a project ID.
- **Translations:** the planned Pidgin, Yorùbá, Hausa and Igbo text needs a review by native speakers.
- **Accessibility pass on real devices:** VoiceOver, TalkBack, the largest text size, and reduce motion.
