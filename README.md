# Waydrop: handover pages

One HTML file per page. Open any file in a browser. Phone and computer layouts are in the same file.

## How each file is organised
1. **CSS**, with section comments (`APP SHELL`, `MAP`, `CARD`, ...). Colours and sizes are variables at the top (`:root`).
2. **HTML**, with section comments. It holds no data, only empty containers with ids.
3. **Script**, in three parts:
   - `DATA`: sample data. The comment above each list names the backend call that fills it (see `WAYDROP_API_CONTRACT.md`). Replace these with real responses.
   - `RENDER`: puts the data on the page. It does not change when the data becomes real.
   - `INTERACTIONS`: taps, tabs and real device conditions (offline, location permission).

Money in the sample data is in naira. The API sends kobo, so divide by 100.

## How the product works (keep it this simple)
**Say what you need → see the price → someone already walking that way brings it → give them your delivery code.**

- **One box** starts everything (bring or buy). Step-by-step only appears when the sentence isn't understood.
- **Price is set by Waydrop** from the campus price list (admin Rules). There is no bidding. Optional "Go faster +₦100".
- **Delivery code** (4 digits) is for handovers. The **wallet PIN** is only for withdrawals. They are never called the same thing.
- **Waydrop Spots** (fixed, busy handover points) are quick choices; "Somewhere else" (drop a pin) is always available.

## Pages (launch set)
| Area | Files |
|---|---|
| 01 Onboarding (dark) | 01-intro, 01a-how-you-pay, 01b-earn-on-your-way (the three story scenes), 01c-welcome, 01d-phone-number, 01e-verification-code, 01f-name-and-photo, 01g-your-campus, 01h-notifications, 01i-sign-in-faster, 01j-youre-in |
| 02 Map home | 02-map-home (shows errands in progress first), 02a-menu, 02b-notifications |
| 03 Sending | 03-send-errand (bring or buy), 03a-step-by-step, 03b-review-and-lock, 03c-drop-a-pin (with Spots), 03d-item-size, 03e-valuable-item, 03f-send-to-someone-else, 03g-when-to-send, 03h-night-safety, 03i-payment, 03j-finding-runner |
| 04 Buy for me | 04a-list-and-budget, 04b-shopping-tracking, 04c-screen-beacon, 04d-what-you-paid |
| 05 Live delivery | 05-track-errand (change drop-off, cancel after accept), 05a-chat, 05b-call, 05c-delivered-and-rate, 05d-receipt, 05e-report-a-problem |
| 06 Runner | 06-start-earning, 06a-choose-id, 06b-scan-id, 06c-type-nin, 06d-selfie-check, 06e-check-and-send, 06f-verification-result, 06g-set-route, 06h-on-route, 06i-deliver, 06j-enter-delivery-code, 06k-payout-and-rate, 06l-delivery-problems, 06m-buy-errand, 06n-respond-to-dispute |
| 07 Wallet | 07-wallet, 07a-transaction-details, 07b-add-money, 07c-withdraw, 07d-my-banks, 07e-statements, 07f-wallet-limit, 07g-reset-wallet-pin |
| 08 Profile, help, safety | 08-profile, 08a-edit-profile, 08b-ratings, 08c-errand-history, 08d-runner-level, 08e-help-centre, 08f-case, 08g-safety-centre, 08h-trusted-contacts, 08i-report-or-block, 08j-settings, 08k-delete-account |
| 13 Admin desk (staff, computer-first) | 13-today, 13a-queue, 13b-dispute-case, 13c-id-check, 13d-errand, 13e-person, 13f-payouts, 13g-prices-and-rules, 13h-spots-and-places, 13i-crew, 13j-audit-log |

Links to 09 and 10 point to pages that come after launch.

## Sign-in and staying signed in
- No passwords. Phone number + 6-digit SMS code (`POST /auth/otp`, `POST /auth/verify`), or Google.
- Session: httpOnly, Secure cookie, 30 days, renewed on use. "This is a shared computer" makes it a browser-session cookie and skips the passkey offer.
- Autofill: the phone field uses `autocomplete="tel-national"`; the code field uses `autocomplete="one-time-code"`, and Android Chrome can read the SMS (WebOTP) if the text ends with `@waydrop.app #123456`.
- Passkeys (WebAuthn) are offered once after sign-in (`01i-sign-in-faster`), saved by Google Password Manager or iCloud Keychain.
- When a session expires, send people to `01e-verification-code.html?reason=expired` with the number filled in and a new code sent.
- Withdrawals still need the wallet PIN even when signed in.
- Returning users (`is_new_user: false`) skip name, campus and notifications.

## Admin desk rules
- Every money or account action asks for a reason and is written to the audit log (`POST /admin/actions`). Nobody can edit or delete the log.
- Every money decision shows its ledger lines before it happens; they always balance.
- Prices, fees, wait times and limits live in **13g-prices-and-rules** (stored as config, no app update needed). The values there are placeholders until the team sets them.
- The admin API uses `/admin/...` routes; staff roles decide who can do what (see 13g).

## Seeing other states of a page
Some pages show one state at a time, driven by the data. Add these to the address to see the others:
- `03j-finding-runner.html?status=no_match` or `accepted`
- `01e-verification-code.html?reason=expired`
- `03i-payment.html?card=declined`
- `04b-shopping-tracking.html?status=price_check` · `swap` · `bought` · `nearby`
- `05-track-errand.html?status=picked_up` · `arrived` · `late` · `runner_cancelled`
- `06f-verification-result.html?status=approved` · `retry` · `rejected` · `name_mismatch` · `under_18` · `expired` · `duplicate`
- `06h-on-route.html?status=offer` · `timed_out` · `ended`
- `06i-deliver.html?step=at_pickup` · `to_dropoff` · `at_dropoff`
- `06l-delivery-problems.html?view=not_ready` · `no_show` · `cancel`
- `06m-buy-errand.html?step=pay` · `find` · `paid`
- `07c-withdraw.html?result=failed`
- `08f-case.html?status=resolved`

In real use the state comes from the server; these are only for viewing.

## Libraries (loaded from the web)
- Fonts: Bricolage Grotesque (headings) and DM Sans (text), from Google Fonts
- Icons: Lucide
- Map: Leaflet 1.9.4 with CARTO "light" OpenStreetMap tiles. Free to start; keep the attribution. The mobile app can use the same style.
- People photos come from `photo_url` in the data (sample portraits in img/).
