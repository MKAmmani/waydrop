# Waydrop System Structure & Architecture

## 1. Overview & Concept

**Waydrop** is a peer-to-peer campus errand and micro-delivery network ("*Errands that ride along your way*"), initially engineered for Nigerian universities, starting with **Bayero University Kano (BUK)**.

The application operates on a dual-mode model:
- **Request Mode (Senders)**: Senders can request items (parcels, food, forgotten items, documents, laundry) to be moved across campus. Senders compose errands using natural language (e.g. *"Bring my calculator from New Hall to Main Library for 500"*), which the system automatically parses and prices.
- **Earn Mode (Runners)**: Students walking along their normal campus routes can view errands waiting along their path, accept delivery requests, and earn money during their routine walks.

---

## 2. Technology Stack

- **Framework**: React Native (`0.86.3`) with Expo (`~57.0.26`, SDK 57)
- **Routing**: Expo Router (`~57.0.24`, file-based navigation)
- **Language**: TypeScript (`^7.0.2`, strict type checking)
- **UI & Gestures**:
  - React Native Reanimated (`4.5.1`) & React Native Worklets (`0.10.1`)
  - React Native Gesture Handler (`~2.32.0`)
  - React Native Safe Area Context (`~5.7.0`)
- **State Management & Persistence**:
  - Zustand (`^5.0.15`)
  - `@react-native-async-storage/async-storage` (`2.2.0`)
  - `expo-secure-store` (`~57.0.4`) for secure credential and token management
- **Maps & Geolocation**:
  - `react-native-maps` (`1.27.2`) with platform-specific native and web fallbacks
  - `expo-location` (`~57.0.20`)
- **Typography & Icons**:
  - `@expo-google-fonts/bricolage-grotesque`, `@expo-google-fonts/dm-sans`, `@expo-google-fonts/caveat`
  - `phosphor-react-native` (`^3.0.6`)
- **Device Capabilities**:
  - `expo-haptics` (`~57.0.3`)
  - `expo-image-picker` (`~57.0.20`)
  - `expo-notifications` (`~57.0.21`)
  - `expo-apple-authentication` & `expo-auth-session` (Google & Apple OAuth)

---

## 3. Directory & File Breakdown

```
waydrop/
├── app/                           # Expo Router file-based screens and routes
│   ├── _layout.tsx                # App root: font loading, splash gate, session hydration, navigation stack
│   ├── index.tsx                  # Splash checkpoint screen (directs new vs returning users)
│   ├── (onboarding)/              # Multi-step onboarding funnel
│   │   ├── intro.tsx              # Interactive story carousel with paper props
│   │   ├── welcome.tsx            # Sign-in entry (Phone, Google, Apple)
│   │   ├── phone.tsx              # Nigerian phone number input & validation
│   │   ├── verify.tsx             # 6-digit SMS OTP verification
│   │   ├── profile.tsx            # Name & profile picture setup
│   │   ├── location.tsx           # Geolocation permission prompt
│   │   ├── area.tsx               # Campus/area confirmation & manual search fallback
│   │   ├── notifications.tsx      # Push notification permissions
│   │   └── ready.tsx              # "You're in" onboarding completion (Send vs Earn choice)
│   └── (app)/                     # Core post-onboarding user interface
│       ├── home.tsx               # Main map interface with pan gesture bottom sheet (Request & Earn modes)
│       ├── send.tsx               # Natural language errand creation
│       ├── review.tsx             # Route quote, bounty adjustments, and lock confirmation
│       └── finding.tsx            # Real-time runner match status & bounty bidding screen
│
├── src/
│   ├── api/                       # API network and data layer
│   │   ├── index.ts               # Public typed API interface and backend switch
│   │   ├── mock.ts                # In-app mock backend (OTP, tasks, quotes, nearby runners)
│   │   └── http.ts                # HTTP client for production backend (token injection, error handling)
│   ├── components/                # Reusable UI & presentation components
│   │   ├── ui/                    # Design system primitives (Button, Text, PressableScale, Layout, Toast)
│   │   ├── art/                   # Custom vector brand graphics, badges, and animated paper props
│   │   └── map/                   # CampusMap view (native maps with Google/Apple Maps, web fallback, styles)
│   ├── data/
│   │   └── campuses/
│   │       └── buk.ts             # Campus places database for Bayero University Kano (BUK)
│   ├── lib/                       # Utilities and domain services
│   │   ├── parseErrand.ts         # Natural language parser for errand text
│   │   ├── phone.ts               # Nigerian phone normalization and format validation
│   │   ├── places.ts & sites.ts   # Campus site detection and place resolution
│   │   ├── storage.ts             # Secure storage helpers for JWT tokens
│   │   ├── social.ts              # OAuth flow helpers
│   │   └── haptics.ts             # Tactile feedback helpers
│   ├── store/                     # Global state management
│   │   ├── session.ts             # User session, authentication, and onboarding route state machine
│   │   └── errand.ts              # In-memory errand drafting store
│   └── theme/
│       └── tokens.ts              # Design tokens (colors, typography, spacing, radii, spring physics)
│
├── assets/                        # App icons, splash screens, and static images
├── scripts/                       # Unit tests (run via Node's native test runner)
│   ├── phone.test.mjs             # Tests for Nigerian phone parsing and formatting
│   └── parse.test.mjs             # Tests for natural language errand extraction
├── app.json                       # Expo configuration (app metadata, permissions, plugins)
├── package.json                   # Project dependencies and script definitions
├── tsconfig.json                  # TypeScript compiler settings
└── system-structure.md            # This architecture and system documentation
```

---

## 4. Architectural Patterns & Core Subsystems

### 4.1 Onboarding State Machine & Resumption
- Located in `src/store/session.ts`.
- `nextOnboardingRoute(session)` acts as a single deterministic decision engine:
  - If user is fully onboarded (`ready`), routes directly to `/(app)/home`.
  - If user dropped out during onboarding, it inspects what has been completed (`seenIntro`, `tokens`, `me.first_name`, `hasLocation`, `me.area_id`, `hasNotifications`, `firstAction`) and routes directly to the exact pending screen.
  - Reopening the app immediately resumes where the user left off.

### 4.2 Dual-Mode API Facade
- Located in `src/api/index.ts`.
- Components interact only with the `api` export.
- When `EXPO_PUBLIC_API_BASE_URL` is unset, `api` routes calls to `src/api/mock.ts`.
  - The mock backend simulates the exact API contract: OTP verification, user creation, quote calculation, and runner matching lifecycle.
- When `EXPO_PUBLIC_API_BASE_URL` is defined, `src/api/http.ts` executes real HTTP requests to the remote backend with automatic authorization header injection and refresh token handling.

### 4.3 Natural Language Errand Parsing
- Located in `src/lib/parseErrand.ts`.
- Allows users to enter unstructured sentences (e.g. *"Get my food from Coke Village to New Hall for 700"*).
- The parser extracts:
  - `item`: What is being transported (*"my food"*).
  - `from`: Origin location (*"Coke Village"*).
  - `to`: Destination location (*"New Hall"*).
  - `amount`: Bounty offer in Naira (*700*).
- Locations are cross-referenced with `src/lib/places.ts` and `src/data/campuses/buk.ts` to suggest verified campus pickup and drop-off points.

### 4.4 Campus Geodata Architecture
- Located in `src/data/campuses/buk.ts`.
- Holds known sites (New Site, Old Site, AKTH, near-campus areas) and places (libraries, hostels, faculties, gates, food spots, markets).
- Each place records alias names (`aka`) for fuzzy searching, coordinates (`lat`, `lng`), place categories (`kind`), and confirmation status (`confirmed`).
- New campuses can be added by placing corresponding data files in `src/data/campuses/`.

### 4.5 Design System & Tokens
- Located in `src/theme/tokens.ts`.
- Standardizes:
  - **Color Palette**: `tangerine` (primary brand color), `paper` (background), `card`, `midnight` (primary text/headers), `mint` (earnings & success), and secondary tones.
  - **Typography**: Display weights via `Bricolage Grotesque`, interface text via `DM Sans`, handwritten accent text via `Caveat`.
  - **Motion**: Standardized spring curves (`snappy`, `bouncy`, `sheet`, `switch`) and easing functions for Reanimated.

---

## 5. Development & Testing Commands

| Command | Action |
|---|---|
| `npm start` / `npx expo start` | Starts the Expo development server |
| `npm run android` | Starts the app on an Android device/emulator |
| `npm run ios` | Starts the app on an iOS simulator |
| `npm run web` | Runs the app in a web browser |
| `npm run typecheck` | Validates TypeScript types across the codebase |
| `npm test` | Runs unit tests (`phone.test.mjs` and `parse.test.mjs`) |
