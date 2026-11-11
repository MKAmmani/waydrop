# Waydrop: step-by-step flow

Open any file in a browser (online, so fonts, icons and the map load). The pages link to each other exactly as the app does. There is no extra menu: you move through them by tapping the real buttons.

**Start here:** `01-intro.html` (new student) or `13-today.html` (staff).

---

## 1. New student signs up
1. `01-intro.html`: story 1, "Stay put. It's coming to you."
2. `01a-how-you-pay.html`: story 2, money is held until the delivery code.
3. `01b-earn-on-your-way.html`: story 3, earning on your walk.
4. `01c-welcome.html`: three promises, then continue with phone number or Google.
5. `01d-phone-number.html`: +234 number.
6. `01e-verification-code.html`: 6-digit SMS code (any code works here except 000000).
7. `01f-name-and-photo.html`: first name, optional photo.
8. `01g-your-campus.html`: find or pick the campus.
9. `01h-notifications.html`: allow notifications.
10. `01i-sign-in-faster.html`: optional fingerprint or face (passkey).
11. `01j-youre-in.html`: choose "Send or buy something" or "Earn on my way".

Returning student: steps 5 → 6 → map. Session expired: `01e-verification-code.html?reason=expired`.

## 2. Send an errand (bring something)
1. `02-map-home.html`: the map. Errands in progress show first.
2. `03-send-errand.html`: one line, e.g. "Bring my calculator from New Hall to the library".
   - Not understood → `03a-step-by-step.html`.
3. `03b-review-and-lock.html`: price set by distance, optional "Go faster", More options:
   - `03c-drop-a-pin.html` (Waydrop Spots or a pin) · `03d-item-size.html` · `03e-valuable-item.html` · `03f-send-to-someone-else.html` · `03g-when-to-send.html` · `03h-night-safety.html` (after 9pm)
   - Wallet short → `03i-payment.html` (card, transfer, USSD; card declined state).
4. `03j-finding-runner.html`: searching → runner found (or no runner → +₦100).
5. `05-track-errand.html`: live map, delivery code, change drop-off or cancel.
   - `05a-chat.html` · `05b-call.html` · `04c-screen-beacon.html` (find each other in a crowd)
6. `05c-delivered-and-rate.html` → `05d-receipt.html`.
   - Problem → `05e-report-a-problem.html`.

## 3. Buy something
1. `03-send-errand.html`: "Buy 6 bottles of water from anywhere. I'm at the Stadium".
2. `04a-list-and-budget.html`: list, estimate, budget held, where to find you.
3. `04b-shopping-tracking.html`: shopping → price check or swap (one tap) → bought → nearby.
4. `04d-what-you-paid.html`: receipt with the refund, then rate.

## 4. Become a runner and deliver
1. `06-start-earning.html` → `06a-choose-id.html`
2. `06b-scan-id.html` (camera) or `06c-type-nin.html` → `06d-selfie-check.html` → `06e-check-and-send.html`
3. `06f-verification-result.html`: checking → approved (or retry, rejected and appeal, name mismatch, under 18, expired, ID already used).
4. `06g-set-route.html`: where you're heading.
5. `06h-on-route.html`: watching your route → errand offer (accept within 25 s).
6. `06i-deliver.html`: to pickup → checks and photo → to drop-off → hand over.
7. `06j-enter-delivery-code.html` (4092 works here) → `06k-payout-and-rate.html`.
   - Problems → `06l-delivery-problems.html` (not ready, no-show, cancel).
   - Buy errands → `06m-buy-errand.html` (list, pay the seller, find them, payout).
   - Requester reported a problem → `06n-respond-to-dispute.html`.

## 5. Wallet
`07-wallet.html` → `07a-transaction-details.html` · `07b-add-money.html` (over the limit → `07f-wallet-limit.html`) · `07c-withdraw.html` (wallet PIN 2580 here; forgot → `07g-reset-wallet-pin.html`) · `07d-my-banks.html` · `07e-statements.html`

## 6. Profile, help and safety
`08-profile.html` → `08a-edit-profile.html` · `08b-ratings.html` · `08c-errand-history.html` · `08d-runner-level.html` · `08e-help-centre.html` → `08f-case.html` · `08g-safety-centre.html` (hold SOS 3 s) → `08h-trusted-contacts.html` · `08i-report-or-block.html` · `08j-settings.html` · `08k-delete-account.html`
Also from the map: `02a-menu.html`, `02b-notifications.html`.

## 7. Staff desk (computer)
`13-today.html` → `13a-queue.html` → `13b-dispute-case.html` · `13c-id-check.html` · `13d-errand.html` · `13e-person.html` · `13f-payouts.html` · `13g-prices-and-rules.html` · `13h-spots-and-places.html` · `13i-crew.html` · `13j-audit-log.html`

---

## Still to write (content, not screens)
Terms, Privacy Policy and Runner Guidelines are linked but not written yet (`href="#"` on the welcome screen and the verification summary).

## Not in the launch set
Routines, rewards and invites, trips, and task help come after launch.
