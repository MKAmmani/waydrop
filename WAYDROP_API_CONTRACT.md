# Waydrop API contract (v0.2)

Collected from every prototype screen. Each section says which screen needs the call, what it sends and gets back, and the rule behind it.

## Conventions

- **Auth:** `Authorization: Bearer <access_token>` (JWT, 15 min) with refresh tokens. Phone number is the account identity.
- **Money:** integers in **kobo** (₦1 = 100 kobo) on the server. The prototypes show naira for readability.
- **Time:** ISO 8601 with offset, e.g. `2026-10-02T21:41:00+01:00`.
- **Idempotency:** every money-moving POST (tasks, top-ups, withdrawals, vendor payments) requires an `Idempotency-Key` header.
- **Errors:** `{ "error": { "code": "INSUFFICIENT_FUNDS", "message": "…", "details": {} } }` with proper HTTP status (400, 401, 403, 404, 409, 422, 423, 429).
- **Pagination:** cursor-based: `?cursor=…&limit=20` → `{ items, next_cursor }`.
- **Realtime:** one authenticated WebSocket per user. Events are `{ "type": "task.updated", "data": {…} }`. On reconnect, the app refetches `GET /tasks/:id` for anything open.
- **Escrow:** every task has a hold. Money only moves through the server; the runner app never receives the requester's PIN.
- **Suggested Nigerian providers:** payments and transfers via Paystack or Flutterwave; KYC via Smile ID, Dojah or YouVerify; SMS via Termii or Africa's Talking; masked calls via Africa's Talking or Twilio.

## Batch 1: Onboarding

### Phone sign-in
```
POST /auth/otp/request { "phone": "+2348031234567" } → { expires_in: 300, resend_after: 30 }
POST /auth/otp/verify { phone, code } → { access_token, refresh_token, is_new_user }
```
Rate-limit OTP requests per phone and per device.

### Google / Apple
```
POST /auth/oauth { provider: "google"|"apple", id_token } → { access_token, needs_phone: true }
```
Phone is still required: runners and requesters reach each other through it (masked).

### Name and photo
```
PATCH /me { first_name, last_name }
POST /me/photo (multipart)
```

### Area
```
GET /areas/nearby?lat=&lng= → { area: { id, name, subtitle }, runners_active }
GET /areas?q=uni → [{ id, name, subtitle }]
PATCH /me { area_id }
```
Waydrop works anywhere; the area just seeds the map and matching.

### Notifications
```
POST /devices { push_token, platform: "android"|"ios", locale }
```

## Batch 2: Map home

### Home
```
GET /home?lat=&lng=&mode=request|earn → { runners_nearby, busy_spots: [{lat,lng,count}], send_again: [task], saved_places: [place], balance }
```
Runner dots on the map are anonymised and slightly delayed for privacy.

### Notifications
```
GET /notifications?cursor= → [{ id, type, title, body, read, created_at }]
POST /notifications/read { ids | "all" }
```

## Batch 3: Send an errand

### Places search
```
GET /places/search?q=Moremi&lat=6.51&lng=3.39
```
Called as the user types a place in the step-by-step form. Results are limited to about 40km around the user.

### Understand the request
```
POST /tasks/parse
{ "text": "Bring my calculator from Moremi Hall to LT3 for 500", "lat": 6.51, "lng": 3.39 }
→ { item, pickup:{name,lat,lng}|null, dropoff, bounty }
```
Optional. The app parses on the device; the backend can take over later with the same response shape.

### Places search
```
GET /places/search?q=lib&lat=…&lng=…
→ [{ id, name, subtitle, lat, lng, distance_m }]
```
"Use my current location" and "Drop a pin" skip this call.

### Quote the trip
```
POST /quotes
{ "pickup": {lat,lng}, "dropoff": {lat,lng} }
→ { distance_m, duration_s, suggested_min, suggested_max, fee_rate, runners_nearby, route: [[lat,lng],…] }
```
Re-called when either place changes. Drives the usual range, walk time and runner count.

### Name a pinned spot
```
GET /places/reverse?lat=…&lng=…
→ { name }
```
Called when the pin settles. Falls back to "Pinned spot near X".

### Add money
```
POST /wallet/topups
{ "amount": 1000, "method": "transfer"|"card"|"ussd" }
→ { virtual_account | checkout_url | ussd_code }
WS wallet.updated → { balance, escrow }
```
Each user gets a dedicated virtual account (e.g. via Paystack or Flutterwave).

### Create errand and hold money
```
POST /tasks
{ "item", "note", "category", "pickup":{name,lat,lng}, "dropoff":{…}, "bounty": 500 }
→ { id, status:"pending", pin, runner_payout, expires_at }
```
The server moves the bounty from balance to escrow in the same transaction. The PIN is only ever sent to the requester.

### Listen for a match
```
WS task.updated → { id, status:"accepted", runner:{name,rating,trips} }
WS task.search_progress → { notified, viewing }
```
Progress lines in the sheet come from search_progress events.

### Raise the offer
```
POST /tasks/:id/bounty { "bounty": 600 }
→ { bounty, runner_payout }
```
Moves the extra amount into escrow and re-notifies runners.

### Cancel for free
```
POST /tasks/:id/cancel
→ { status:"cancelled" }
WS wallet.updated
```
Only allowed while status is "pending". After a runner accepts, cancelling goes through Help (batch 8).

### Runner accepted
```
WS task.updated { status:"accepted" }
WS task.runner_location { lat, lng }
```
Batch 4 picks up from here.

## Batch 3B: Buy for me

### Detect a buy errand
```
POST /tasks/parse { "text": "Buy 6 bottles of water…" }
→ { type:"buy", items:[{name,qty,est_price}], source:"any", dropoff }
```
Prices come from a small price table per area, updated from real receipts.

### Create a buy errand
```
POST /tasks {
 "type": "buy",
 "items": [{ "name": "Bottled water, 75cl", "qty": 6, "est_price": 300 }],
 "source": { "mode": "any" } | { "mode": "shop", "place_id" },
 "budget": 2000, "fee": 400,
 "rules": { "price": "ask"|{"auto_up_to":300}|"fit", "stock": "ask"|"similar"|"skip" },
 "dropoff": { lat, lng, note, photo_url, live_share: true }
}
→ escrow holds budget + fee
```
Budget and fee are held separately so refunds and payouts stay clean.

### Shopping
```
WS task.updated { status:"shopping", spent: 0 }
```

### Price check
```
Runner: POST /tasks/:id/asks { "type":"price", "item_id", "price": 350, "photo" }
Requester: POST /tasks/:id/asks/:ask_id { "answer": "approve"|"fewer"|"skip" }
→ escrow tops up by the difference
```
Expires in 2 min; the server then applies the "fit" rule automatically.

### Swap suggestion
```
POST /tasks/:id/asks { "type":"swap", "item_id", "replacement":"Aquafina 75cl", "price": 300, "photo" }
```
Skipped entirely when the requester chose "Similar brand is fine".

### Bought
```
WS task.updated { status:"bought", spent: 1800, refund: 200, receipt_url }
WS wallet.updated (refund lands now)
```
Unspent budget is refunded the moment the purchase is logged, not at the end.

### Close by
```
WS task.runner_location …
WS task.proximity { meters: 30 }
```

### Screen beacon
```
POST /tasks/:id/beacon { "on": true }
WS task.beacon → runner sees "Look for a flashing orange screen"
```
Works without GPS precision, which is poor inside stadiums.

### Completed
```
WS task.updated { status:"completed" } → receipt with spend, fee, refund
```

### Buy offer
```
WS offer.created { task: { type:"buy", items, budget, source:"any" }, runner_payout: 400, needs_cash: false }
```
Runners can opt out of buy errands, or of cash ones, in settings.

### Shopping list
```
PATCH /tasks/:id/items/:item_id { "got": true, "price": 300 }
```
Each check-off updates the requester's budget meter live.

### Pay the seller
```
GET /banks/resolve?account=0123456789&bank=moniepoint → { account_name }
POST /tasks/:id/vendor_payments { bank_code, account_number, amount: 1800, receipt_photo }
→ transfer sent from escrow (e.g. Paystack Transfers)
```
The runner never touches the money. The server caps amount at the remaining budget.

### Cash bought
```
POST /tasks/:id/cash_purchases { amount: 1800, receipt_photo }
→ { reimbursable: 1800, released_on: "completed" }
```
Capped per errand and per runner. Cash claims without a photo are rejected.

### Find in a crowd
```
WS task.requester_location { lat, lng }  (only within 300m, only if live_share)
POST /tasks/:id/beacon_request
```

### Fee and cash refund
```
POST /tasks/:id/verify_pin → { payout: 400, cash_refund: 1800 }
WS wallet.updated
```
Both land together; the receipt shows them as separate lines.

## Batch 3C: Real-life cases

### Item rules
```
POST /tasks/check { "text": "…" }
→ { verdict: "allowed"|"restricted"|"blocked", rule_id, message }
```
Rules live on the server so they can change without an app update. The app also checks offline with a cached copy.

### Size and matching
```
POST /tasks { …, "size": "pocket"|"bag"|"heavy"|"bulky" }
→ offers only go to runners whose mode fits (walk, bike, car)
```
Size also adjusts the suggested fee.

### Valuable items
```
POST /tasks { …, "declared_value": 120000 }
→ min runner level: { trips: 50, rating: 4.8 }; pickup photo and PIN enforced
```
Declared value sets the protection amount.

### Send to someone else
```
POST /tasks { …, "recipient": { "name": "Ada", "phone": "+2348035551290" } }
→ SMS with PIN + tracking link (via Termii or Africa's Talking)
```
The recipient link is a lightweight web page, no login.

### Recipient web page
```
GET /t/:short_code → public tracking (no personal data except first names)
POST /t/:short_code/call → masked call
```
Link expires 1 hour after delivery.

### Schedule or no rush
```
POST /tasks { …, "timing": "now"|"flexible"|{ "scheduled_for": "2026-10-02T08:00:00+01:00" } }
```
Scheduled errands hold money 20 minutes before; flexible ones are matched to runners already passing.

### Scheduled
```
Job runs at scheduled_for − 20 min → holds money → starts matching
Push reminder to the requester
```

### Night safety
```
POST /tasks { …, "safety": { "auto_share_contact_id": "c_12", "prefer_female_runner": true } }
```
Female preference only applies where enough runners are available; the requester is told if it falls back.

### Pay without topping up
```
POST /tasks { …, "payment": { "wallet": 300, "card": 2100 } }
→ Paystack charge for the card part; escrow holds the total
```

### Card payment
```
POST /payments/charge { "authorization_code": "AUTH_…", "amount": 2100 }
→ 3DS/OTP handled by Paystack if needed
```
Saved cards are tokens; Waydrop never stores card numbers.

### Pay by transfer
```
POST /payments/virtual_account { "amount": 800, "expires_in": 1800 }
Webhook charge.success → task posted
```

### Offline queue
```
Saved locally with a client_id; on reconnect: POST /tasks { client_id, … } (idempotent, so it never posts twice)
```

### SMS fallback
```
On task creation: SMS the PIN to the requester
Runner offline: inbound SMS "PIN 4092 T7Q2" → POST /sms/inbound → verify_pin
```
Inbound SMS is tied to the runner's verified phone number.

## Batch 4: Live delivery (requester)

### Live tracking
```
WS task.runner_location → { task_id, lat, lng, heading, eta_s }  (every 3–5s)
WS task.updated → { status:"accepted" }
GET /tasks/:id  (on reconnect)
```
Marker glides between updates instead of jumping. ETA comes from the server, not the client.

### Pickup confirmed
```
WS task.updated → { status:"picked_up", pickup_photo_url, picked_up_at }
```
The runner app requires a photo before "Item collected" works (batch 6).

### Pickup photo
```
GET pickup_photo_url (signed, expires in 24h)
```
"Not my item" opens a report with the photo attached.

### Handshake
```
WS task.updated → { status:"arrived" }
WS task.updated → { status:"completed" }  (after the runner enters the PIN)
```
The PIN is only sent to the requester when the task is created. The runner app never receives it.

### Chat
```
GET /tasks/:id/messages
POST /tasks/:id/messages { "text" }
WS message.created
```
Messages containing the PIN are blocked on the device and on the server.

### Masked call
```
POST /tasks/:id/call → { proxy_number }
```
Bridged through a provider like Twilio or Africa's Talking so neither side sees a real number.

### Escrow released
```
WS task.updated → { status:"completed", completed_at }
WS wallet.updated → { balance, escrow }
```
Runner payout and platform fee are split on the server.

### Rating and tip
```
POST /tasks/:id/rating { "stars": 5, "tags": ["Fast"], "note": "", "tip": 100 }
```
Tip moves straight from requester balance to runner. Notes are private to Waydrop.

### Receipt
```
GET /tasks/:id/receipt → { lines, timeline, reference }
GET /tasks/:id/receipt.pdf
```

### Report a problem
```
POST /tasks/:id/disputes { "reason": "wrong_item", "text": "…", "photo": file }
→ { case_id, sla_minutes }
```
Opening a dispute freezes escrow release until support resolves it.

### Case created
```
WS dispute.updated → { case_id, status, message }
```
Safety reports page the on-call safety team immediately.

### Runner cancelled
```
WS task.updated → { status:"pending", runner:null, reason:"runner_cancelled" }
```
Task goes back to matching automatically. PIN and escrow stay the same.

## Batch 5: Earn on route (verification + offers)

### Check runner status
```
GET /me → { runner_status: "unverified"|"pending"|"verified"|"rejected" }
```
Earn mode shows this gate until runner_status is "verified".

### Start verification
```
POST /kyc/sessions → { session_id, provider: "smile_id"|"dojah"|"youverify" }
```
Use a Nigerian KYC provider; documents go straight to them, not your database.

### Choose ID type
```
PATCH /kyc/sessions/:id { "id_type": "student_id"|"nin"|"passport" }
```

### Upload ID photo
```
POST /kyc/sessions/:id/document  (multipart: front.jpg)
→ { quality: "ok"|"blurry"|"glare", fields: {name, id_number, expiry} }
```
Quality is checked instantly so people can retake before submitting.

### Check NIN
```
POST /kyc/sessions/:id/nin { "nin": "12345678901" }
→ { name_match: true, first_name, last_name }
```
NIN is never stored in plain text or shown back in full.

### Liveness selfie
```
POST /kyc/sessions/:id/selfie  (multipart: frames[])
→ { liveness: "pass"|"fail", face_match: 0.97 }
```
The provider SDK runs the head-turn and blink checks.

### Submit for review
```
POST /kyc/sessions/:id/submit { "agreed_guidelines": true }
→ { status: "pending" }
```

### Wait for result
```
WS kyc.updated → { status: "verified"|"rejected", reasons: [] }
Push notification when done
```

### Verified
```
WS kyc.updated → { status: "verified" }
```
Unlocks Earn mode everywhere the user is signed in.

### Fix one thing
```
WS kyc.updated → { status: "rejected", reasons: ["document_blurry"], retry_steps: ["document"] }
```
Only the failed step is redone; everything else is kept.

### Route preview
```
POST /routes { "from":{lat,lng}, "to":{lat,lng}, "mode":"walk" }
→ { polyline, distance_m, duration_s }
```
Detour setting changes which errands get offered, not the route itself.

### Start a runner session
```
POST /runner/session { "origin", "destination", "mode": "walk", "detour_m": 250, "route": [[lat,lng],…] }
POST /runner/location { lat, lng }  (every 5–10s)
POST /runner/session/pause | /resume
```
The server matches errands within detour_m of the route and ahead of the runner.

### Background alert
```
Push (FCM/APNs): { type:"offer", task_id, title, body, expires_at }
```
Shows on the lock screen; tapping opens the offer if it hasn't expired.

### Errand offered
```
WS offer.created → { task:{ id, item, pickup, dropoff, bounty }, runner_payout: 720, distance_from_route_m: 50, detour_s: 120, expires_at }
```
One offer at a time per runner. The PIN is never included.

### Accept
```
POST /tasks/:id/accept → { task }  (409 OFFER_GONE if someone else was faster)
```
If two runners swipe at once, the first request wins; the other sees "Someone else got this one".

### Offer expired
```
WS offer.expired → { task_id }
POST /tasks/:id/decline  (for Skip)
```
Skips and timeouts are not counted against runners.

### End route
```
DELETE /runner/session → { walked_m, offers_seen, earned_today }
```

## Batch 5B: ID check edge cases

### Camera permission
```
Device only: expo-camera permission status
POST /kyc/sessions/:id/document (gallery upload allowed for the document only)
```
Selfie always needs the live camera and the provider's liveness SDK.

### Liveness retries
```
POST /kyc/sessions/:id/selfie → { liveness:"fail", reason:"too_dark"|"no_face"|"occluded", attempts_left: 2 }
After 3 fails: POST /kyc/sessions/:id/manual_review
```
Manual reviews land in the Admin Desk ID-check queue.

### Name mismatch
```
POST /kyc/sessions/:id/name_resolution { choice:"use_id_name"|"nickname"|"legal_change", document? }
→ use_id_name: PATCH /me { first_name, last_name }
```
Payouts always use the verified legal name.

### Under 18
```
kyc.updated { status:"rejected", reason:"under_18", eligible_on:"2027-03-15" }
ID images deleted on rejection
```
Requester features stay on; a reminder is scheduled for eligible_on.

### ID already used
```
kyc.updated { status:"rejected", reason:"duplicate_document" }
POST /kyc/duplicate_claims { type:"my_old_account"|"identity_theft" }
```
Identity theft claims pause the other account and open a high-priority case.

### Expired ID
```
POST …/document → { quality:"ok", expired:true } → client offers other ID types
```
Selfie result is kept for 30 days so it isn't redone.

### Final rejection
```
kyc.updated { status:"rejected", reason:"face_mismatch", appealable:true }
```
Rejection only switches off earning.

### Appeal
```
POST /kyc/appeals { session_id, text, photos[] } → { case_id, sla_hours: 48 }
```
Reviewed by a different staff member than the original decision (enforced in the Desk).

### Long review
```
GET /kyc/sessions/:id → { status:"manual_review", eta }
Push on kyc.updated
```

### Upload or partner failure
```
Client keeps files locally and retries with backoff (same session_id, idempotent)
Provider outage: session status "provider_delayed", completes asynchronously via webhook
```

### ID expiring
```
Daily job: documents expiring in ≤14 days → push + in-app banner
POST /kyc/sessions { type:"document_refresh" } (document only)
```
At expiry: runner_status → "expired", earning paused, nothing else affected.

### Spot selfie
```
POST /tasks/:id/accept → 428 { required:"selfie_check" } for declared_value > 50000 or random 1-in-50
POST /kyc/spot_checks { selfie } → { match:true } then retry accept
```
Stops verified runners from lending their account to someone else.

### Wallet tiers
```
GET /wallet/limits → { tier: 1, max_balance: 5000000, next:{ tier:2, needs:["bvn"], max_balance: 30000000 } } (kobo)
POST /wallet/topups → 422 LIMIT_EXCEEDED { room: 1150000 }
```
Tier amounts come from the payment partner's licence; keep them in admin Rules, not in the app.

### BVN check
```
POST /kyc/bvn { bvn, dob } → { name_match, dob_match } (via the KYC provider)
```
BVN is never stored in plain text and never shown back.

### Tier upgraded
```
wallet.updated { tier: 2, max_balance: 30000000 }
```

## Batch 6: Runner delivery

### Heading to pickup
```
POST /runner/location { lat, lng, heading }  (every 3–5s)
GET /tasks/:id → { pickup, dropoff, note, payout }
```
Location is what the requester sees moving in batch 4. Arrival is detected within ~40m.

### Arrived at pickup
```
POST /tasks/:id/arrived_pickup { lat, lng }
```
Server checks distance; the "You look a bit far" prompt shows if GPS disagrees.

### Pickup photo (required)
```
POST /tasks/:id/pickup  (multipart: photo.jpg, lat, lng)
→ { status:"picked_up" }
```
The photo is what the requester sees in batch 4 before they share the PIN.

### Heading to drop-off
```
POST /runner/location …
WS task.updated (if the requester changes the note)
```

### Arrived at drop-off
```
POST /tasks/:id/arrived_dropoff { lat, lng }
→ push to requester: "Your runner is here"
```

### Verify PIN
```
POST /tasks/:id/verify_pin { "pin": "7315" }
→ 200 { status:"completed", payout } | 422 { attempts_left: 3 }
```
The runner app never receives the PIN. The server checks it, counts attempts and releases escrow in one transaction.

### Locked after 5 tries
```
423 { locked: true, case_id }
WS dispute.updated
```
Locking opens a support case automatically; escrow stays held.

### Paid
```
WS wallet.updated → { balance, today_earned, today_count }
```
Roll-up animates from the old to the new balance.

### Rate requester
```
POST /tasks/:id/requester_rating { "thumb": "up", "tags": [] }
```
Private. Repeated thumbs-down are reviewed by the trust team.

### Back on route
```
POST /runner/session/resume
WS offer.created …
```
Offers resume automatically after a delivery.

### Pickup problem
```
POST /tasks/:id/issues { "type": "not_ready"|"closed"|"mismatch"|"too_heavy"|"payment_requested" }
POST /tasks/:id/runner_cancel { "reason", "at_fault": false }
```
Not-at-fault cancels don't affect runner priority.

### Handover help
```
POST /tasks/:id/issues { "type": "pin_refused"|"pin_unknown" }
```

### Requester no-show
```
POST /tasks/:id/no_show  (allowed 5 min after arrived_dropoff)
→ { wait_comp: 200, case_id }
```
Wait timer runs on the server so it can't be faked.

### No-show reported
```
WS wallet.updated (+₦200)
WS dispute.updated
```

### Runner cancels
```
POST /tasks/:id/runner_cancel { "reason": "personal", "at_fault": true }
→ task returns to matching
```

## Batch 7: Wallet

### Wallet
```
GET /wallet → { available, held, pending_cash, currency:"NGN" }
GET /wallet/transactions?cursor=…&filter=in|out|held
WS wallet.updated → { available, held, pending_cash }
```
Amounts are integers in kobo on the server. Balance changes trigger the one-time roll-up and shine.

### Money on hold
```
GET /wallet/holds → [{ task_id, title, budget, fee, status, release_rule }]
```
Holds are escrow rows tied to a task; they can never be withdrawn.

### Transaction
```
GET /wallet/transactions/:id → { type, amount, status, timeline[], task_id, reference }
GET /wallet/transactions/:id/receipt.pdf
```

### Add money
```
GET /wallet/virtual_account → { bank, account_number, account_name }  (permanent, per user)
POST /wallet/topups { amount, method:"card" } → Paystack charge
Webhook charge.success → wallet.updated
```
The permanent account means users can save "Waydrop" as a beneficiary in their bank app.

### Withdraw: amount
```
Client checks: amount ≥ 500 and ≤ available
```
Server re-checks everything; the client checks are only for instant feedback.

### Withdraw: bank
```
GET /bank_accounts → [{ id, bank_code, last4, account_name, default }]
```

### Withdraw: confirm
```
POST /wallet/withdrawals { amount, bank_account_id, pin } + Idempotency-Key header
→ 202 { id, status:"processing" }
```
Idempotency stops double withdrawals if someone taps twice on a slow network. 3 wrong PINs locks withdrawals for 5 minutes.

### Withdrawal sent
```
Webhook transfer.success → WS wallet.updated + push "₦2,000 sent to Kuda"
```

### Withdrawal failed
```
Webhook transfer.failed | transfer.reversed → refund to available → WS wallet.updated
```
The money returns automatically; users never have to chase it.

### Wallet PIN
```
POST /wallet/pin { pin } (hashed server-side)
POST /wallet/pin/reset → OTP + selfie match
```
Weak PINs like 1234 or 1111 are refused.

### Saved banks
```
GET /bank_accounts
PATCH /bank_accounts/:id { default: true }
DELETE /bank_accounts/:id
```

### Add bank
```
GET /banks → list with codes
GET /banks/resolve?bank_code=&account_number= → { account_name }
POST /bank_accounts { bank_code, account_number }  → 422 NAME_MISMATCH if not the KYC name
```
Same-name rule stops stolen accounts from cashing out to someone else.

### Statements
```
POST /wallet/statements { from, to, format:"pdf"|"csv" } → { url } + email copy
```

## Batch 8: Profile, help, safety, settings

### Me
```
GET /me → { name, rating, counts, badges, runner_status }
```

### Public profile
```
GET /users/:id/public → { first_name, last_initial, rating, rating_count, distribution, top_tags, reviews[] }
POST /ratings/:id/appeal { reason }
```
Public profile never includes phone, full name or exact location.

### Edit profile
```
PATCH /me { last_name, email, photo }
POST /me/phone/change → OTP
```
First name is locked to the verified ID.

### Errand history
```
GET /tasks?role=requester|runner&cursor=… → [{ id, title, status, amount, other_party, created_at }]
```

### Help centre
```
GET /help/articles?q=…
GET /disputes?status=open
```
Articles are managed in a CMS so support can update them without an app release.

### New dispute
```
POST /tasks/:id/disputes { reason, text, photos[] } → { case_id, sla_hours: 24 }
```
Allowed until 48 hours after completion. Escrow or the runner payout is frozen while open.

### Case
```
GET /disputes/:id → { status, timeline, messages, evidence }
POST /disputes/:id/messages { text, photos[] }
WS dispute.updated
```
Support sees both sides' photos (pickup photo, receipt, requester's evidence) side by side.

### Decision
```
WS dispute.updated { status:"resolved", outcome:"refund_full", amount: 800, runner_paid: true }
POST /disputes/:id/appeal (once, within 7 days)
```
Waydrop can cover a refund without taking pay from an honest runner.

### Safety centre
```
POST /safety/sos { lat, lng, task_id } → pages on-call safety team
POST /safety/share { contact_id, duration_min: 60 } → SMS link
```
The SOS button also opens the phone dialer with 112.

### Trusted contacts
```
GET/POST/DELETE /safety/contacts (max 5)
```

### Report or block
```
POST /users/:id/reports { reason, task_id }
POST /users/:id/block → excluded from matching both ways
```
Blocked users are never told.

### Runner preferences
```
PATCH /runner/prefs { buy_errands, cash_purchases, cash_cap, mode, default_detour_m, night_errands }
```
Matching reads these on every offer.

### Notifications
```
PATCH /me/notifications { task_updates, route_offers, messages, marketing }
```
Safety and money notifications can't be turned off.

### Language
```
PATCH /me { locale: "en"|"pcm"|"yo"|"ha"|"ig" }
```
Push and SMS text also follow this setting.

### Accessibility
```
Stored on the device only
```
Reduce motion also follows the phone's own setting.

### Privacy
```
GET /me/sessions, DELETE /me/sessions/:id
POST /me/data_export
```

### Invites
```
GET /referrals → { code, earned, friends[] }
Reward paid on the friend's first completed errand
```
One reward per verified phone number, to stop abuse.

### Delete account
```
POST /me/delete → 409 { blockers: ["wallet_balance", "active_tasks"] } until resolved
```
Transaction records are kept 7 years for financial compliance; the rest is erased in 30 days.

## Batch 9: Routine routes

### Routines
```
GET /runner/routines → [{ id, from, to, days:[1..7], window:{start,end}, detour_m, active, est_weekly }]
PATCH /runner/routines/:id { active }
```
Active routines feed the nightly planner.

### Save a routine
```
POST /runner/routines { from_place_id, to_place_id, days:[1,2,3,4,5], window:{ start:"07:40", end:"08:00" }, detour_m: 250, mode:"walk" }
GET /routines/estimate?from=&to=&days=&window= → { est_weekly, walkers_count }
```
Estimate comes from past demand on that corridor, shared across walkers.

### Nightly plan
```
Job at rules.routine_notice (20:00): matches scheduled + "with walkers" errands to routines → push
GET /runner/plans/tomorrow → { stops:[{ time, task_id, kind:"pickup"|"dropoff" }], earn }
POST /runner/plans/:id/confirm { skip_task_ids:[] }
```
Skipped errands go back into the pool immediately. Unconfirmed plans expire at 22:00 and go to other walkers.

### Morning of
```
Push at window.start − 10 min
POST /runner/plans/:id/start → hands off to the normal task flow (batch 6), multi-stop
POST /runner/plans/:id/late { minutes: 10 } → notifies requesters
```
If the runner hasn't started by window.end + 5 min, tasks are re-matched (walker, then Crew).

### Pause
```
POST /runner/routines/pause { until: "2026-11-14" | null, reason: "exams" }
```
Missed confirmed walks reduce routine priority for 7 days.

### Send with walkers
```
GET /quotes?…&timing=walkers → { walkers: { count, eta:"08:05", price: 350 }, now: { price: 500, match_eta_s: 180 } }
POST /tasks { …, timing: { mode: "walkers", by: "2026-10-08T08:05:00+01:00" } }
```
Price uses rules.routine_discount. Money is held at posting, released on PIN like any errand.

### Matched to a walk
```
WS task.updated { status:"planned", runner, pickup_eta } (after the runner confirms at night)
Push: "Tobi will bring your lab coat by 8:05am"
```
If no walker confirms by 20:00, the requester is told and offered "right now".

## Batch 10: Waydrop Desk (admin and support)

### Staff access
```
All /admin/* calls need a staff token with a role: support | support_lead | finance | admin.
Every POST/PATCH needs { "reason": "…" } and writes an append-only audit entry.
```
Role limits: support refunds up to ₦5,000, support_lead up to ₦50,000, only admin edits rules. Nobody can edit or delete the audit log.

### Today: campus pulse
```
GET /admin/pulse?campus=unilag → { match_median_s, match_p90_s, no_runner_rate, open_tasks, buy_tasks, runners_on_route, routine_runners, escrow_total, ledger_balanced }
WS admin.live → { errands:[{lat,lng,state}], runners:[{lat,lng,crew}] } (positions rounded for privacy)
```

### Needs you queue
```
GET /admin/queue?type=dispute|kyc|pin|payout|place|safety&campus= → [{ id, type, title, ref, sla_due_at }]
```
One list across all work types, sorted by SLA due time.

### Decide a dispute
```
GET /admin/disputes/:id → { evidence:{ pickup_photo, requester_photos, runner_statement }, timeline, messages, history }
POST /admin/disputes/:id/decision { outcome:"refund_full"|"refund_partial"|"release", refund_amount, runner_paid, covered_by:"waydrop"|"runner", reason }
→ { ledger_entries:[…] }
POST /admin/disputes/:id/messages { to:"requester"|"runner", text }
```
The client shows the same ledger entries as a preview before confirming (POST …/decision?dry_run=1).

### ID check review
```
GET /admin/kyc/:id → { document_url, selfie_url, extracted:{name,dob,expiry,number}, account_name, face_match, liveness, provider_score, duplicate_of }
POST /admin/kyc/:id/decision { decision:"approve"|"redo"|"reject", redo_steps:["document"|"selfie"], reject_reason, reason }
```
Age under 18 is an automatic reject.

### Errand inspector
```
GET /admin/tasks/:ref → { state, timeline, pin_attempts:[masked], ledger, messages }
POST /admin/tasks/:id/confirm_handover { reason }
POST /admin/tasks/:id/reissue_pin { reason }
POST /admin/tasks/:id/cancel { refund_amount, runner_comp, reason }
```
PIN attempts are stored masked except for the first digit.

### People
```
GET /admin/users/:id → { roles, kyc, wallet:{available,held}, rating, disputes, reports, tasks }
POST /admin/users/:id/pause_runner { reason, until }
POST /admin/users/:id/block { reason } (freezes wallet)
POST /admin/users/:id/warn { reason }
```

### Payouts
```
GET /admin/payouts?status=failed|reversed
POST /admin/payouts/:id/retry { reason }
POST /admin/payouts/:id/request_new_bank { reason }
GET /admin/reconciliation?date= → { partner_balance, ledger_balance, difference }
```

### Campus places
```
GET /admin/places?status=pending&campus= → [{ id, name, lat, lng, uses, suggested_merge }]
POST /admin/places/:id/approve | /rename { name } | /merge { into_id } | /reject
→ approve pays the naming reward to the creator
```

### Crew and routine coverage
```
GET /admin/crew?campus= → [{ user_id, zone, shift, available, tasks_today }]
PATCH /admin/crew/:id { available }
PATCH /admin/settings { crew_net_enabled }
GET /admin/routines/coverage?date= → [{ corridor, window, runners, tasks, status:"covered"|"tight"|"short" }]
```

### Rules and audit
```
GET /admin/rules → [{ key, value, unit, description }]
PATCH /admin/rules { changes:{ offer_ttl: 30 }, reason } (admin only; applies to new tasks)
GET /admin/audit?cursor= → [{ at, staff, action, object, reason }]
```

## Batch 11: Rewards, invites, trips and help

### Home: trips and hall
```
GET /trips?campus=buk&near=lat,lng → [{ id, runner, to, leaves_at, back_by, mode, spots_left }]
GET /halls/leaderboard?campus=buk&month= → [{ hall, errands, rank }]
```

### The + menu
```
No call. Opens: send (batch 3), buy (3B), help (skill errands), or post a trip (runners only)
```
One entry point for everything new keeps the app easy to learn.

### Points
```
GET /rewards → { points, worth_kobo, catalog:[{ id, title, points }] }
Points: +1 per ₦10 completed (spent or earned), expire after 6 months
```
Points are a separate ledger from money.

### Redeem
```
POST /rewards/redeem { item_id, phone? } → { status }
(data and airtime via a VTU provider)
```
Idempotency-Key required, like money.

### Invites
```
GET /referrals → { code, link, earned, friends:[{ name, stage }] }
POST /referrals/:friend_id/remind (max once per 3 days)
```
Rules: friend ₦300 off; inviter ₦200 after friend's first completed errand ≥ ₦300 within 30 days; cap 20/month.

### Happy-moment ask
```
Shown after a 4–5★ rating, at most once a week
```
Asking right after a good experience gets the most invites.

### Reward paid
```
WS referral.updated { friend, stage:"rewarded", amount: 20000 }
WS wallet.updated
```
Reversed automatically if the friend's errand is refunded.

### Invite applied
```
Deferred deep link → POST /referrals/claim { code } → { discount: 30000 }
```
Blocked if the same device, phone or ID as the inviter.

### Discount at checkout
```
POST /quotes → { …, discounts:[{ kind:"invite", amount: 30000 }] }
```
Runner payout is unchanged; Waydrop funds the discount.

### Post a trip
```
POST /trips { to_place, leaves_at, back_by, mode:"walk"|"keke"|"bike"|"car", spots: 3 }
```
Verified runners only. Town trips: daylight hours only (admin rule).

### Your trip
```
WS trip.updated { joined:[{ task_id, summary, fee }] }
POST /trips/:id/start | /cancel
```
On cancel, joined errands go back to normal matching.

### Join a trip
```
POST /trips/:id/join { type:"buy", items, budget } → task with fare_share
Fare share = trip fare ÷ errands on the trip
```
Fare shown as its own line so nobody feels cheated.

### Help types
```
GET /skills/categories → typing, print, format, fix, design, tutor
```
Assignment, test and exam requests are blocked by the same item-rules check as banned items.

### Post a task
```
POST /tasks { type:"skill", category, description, files[], due_by, own_work_confirmed: true }
```

### Prices
```
WS task.quote { runner, price, ready_by } (up to 3)
POST /tasks/:id/accept_quote { quote_id } → money held
```
Only runners with that skill on their profile can quote.

### Approve or revise
```
POST /tasks/:id/deliver { files[] } (runner)
POST /tasks/:id/approve | /revise { note } (1 free revision)
Auto-approve 48h after delivery
```
Disputes go to the Desk with the files side by side.

### Blocked request
```
POST /tasks/check { text } → { verdict:"blocked", rule:"academic_misconduct", alternatives:[…] }
```

## Index: all endpoints

| Method | Path | First needed in |
|---|---|---|
| GET | `/admin/audit` | Batch 10 |
| GET | `/admin/crew` | Batch 10 |
| PATCH | `/admin/crew/:id` | Batch 10 |
| GET | `/admin/disputes/:id` | Batch 10 |
| POST | `/admin/disputes/:id/decision` | Batch 10 |
| POST | `/admin/disputes/:id/messages` | Batch 10 |
| GET | `/admin/kyc/:id` | Batch 10 |
| POST | `/admin/kyc/:id/decision` | Batch 10 |
| GET | `/admin/payouts` | Batch 10 |
| POST | `/admin/payouts/:id/request_new_bank` | Batch 10 |
| POST | `/admin/payouts/:id/retry` | Batch 10 |
| GET | `/admin/places` | Batch 10 |
| POST | `/admin/places/:id/approve` | Batch 10 |
| GET | `/admin/pulse` | Batch 10 |
| GET | `/admin/queue` | Batch 10 |
| GET | `/admin/reconciliation` | Batch 10 |
| GET | `/admin/routines/coverage` | Batch 10 |
| GET | `/admin/rules` | Batch 10 |
| PATCH | `/admin/rules` | Batch 10 |
| PATCH | `/admin/settings` | Batch 10 |
| POST | `/admin/tasks/:id/cancel` | Batch 10 |
| POST | `/admin/tasks/:id/confirm_handover` | Batch 10 |
| POST | `/admin/tasks/:id/reissue_pin` | Batch 10 |
| GET | `/admin/tasks/:ref` | Batch 10 |
| GET | `/admin/users/:id` | Batch 10 |
| POST | `/admin/users/:id/block` | Batch 10 |
| POST | `/admin/users/:id/pause_runner` | Batch 10 |
| POST | `/admin/users/:id/warn` | Batch 10 |
| GET | `/areas` | Batch 1 |
| GET | `/areas/nearby` | Batch 1 |
| POST | `/auth/oauth` | Batch 1 |
| POST | `/auth/otp/request` | Batch 1 |
| POST | `/auth/otp/verify` | Batch 1 |
| GET | `/bank_accounts` | Batch 7 |
| POST | `/bank_accounts` | Batch 7 |
| DELETE | `/bank_accounts/:id` | Batch 7 |
| PATCH | `/bank_accounts/:id` | Batch 7 |
| GET | `/banks` | Batch 7 |
| GET | `/banks/resolve` | Batch 3B |
| POST | `/devices` | Batch 1 |
| GET | `/disputes` | Batch 8 |
| GET | `/disputes/:id` | Batch 8 |
| POST | `/disputes/:id/appeal` | Batch 8 |
| POST | `/disputes/:id/messages` | Batch 8 |
| GET | `/halls/leaderboard` | Batch 11 |
| GET | `/help/articles` | Batch 8 |
| GET | `/home` | Batch 2 |
| POST | `/kyc/appeals` | Batch 5B |
| POST | `/kyc/bvn` | Batch 5B |
| POST | `/kyc/duplicate_claims` | Batch 5B |
| POST | `/kyc/sessions` | Batch 5 |
| GET | `/kyc/sessions/:id` | Batch 5B |
| PATCH | `/kyc/sessions/:id` | Batch 5 |
| POST | `/kyc/sessions/:id/document` | Batch 5 |
| POST | `/kyc/sessions/:id/manual_review` | Batch 5B |
| POST | `/kyc/sessions/:id/name_resolution` | Batch 5B |
| POST | `/kyc/sessions/:id/nin` | Batch 5 |
| POST | `/kyc/sessions/:id/selfie` | Batch 5 |
| POST | `/kyc/sessions/:id/submit` | Batch 5 |
| POST | `/kyc/spot_checks` | Batch 5B |
| GET | `/me` | Batch 5 |
| PATCH | `/me` | Batch 1 |
| POST | `/me/data_export` | Batch 8 |
| POST | `/me/delete` | Batch 8 |
| PATCH | `/me/notifications` | Batch 8 |
| POST | `/me/phone/change` | Batch 8 |
| POST | `/me/photo` | Batch 1 |
| GET | `/me/sessions` | Batch 8 |
| DELETE | `/me/sessions/:id` | Batch 8 |
| GET | `/notifications` | Batch 2 |
| POST | `/notifications/read` | Batch 2 |
| POST | `/payments/charge` | Batch 3C |
| POST | `/payments/virtual_account` | Batch 3C |
| GET | `/places/reverse` | Batch 3 |
| GET | `/places/search` | Batch 3 |
| GET | `/quotes` | Batch 9 |
| POST | `/quotes` | Batch 3 |
| POST | `/ratings/:id/appeal` | Batch 8 |
| GET | `/referrals` | Batch 8 |
| POST | `/referrals/:friend_id/remind` | Batch 11 |
| POST | `/referrals/claim` | Batch 11 |
| GET | `/rewards` | Batch 11 |
| POST | `/rewards/redeem` | Batch 11 |
| POST | `/routes` | Batch 5 |
| GET | `/routines/estimate` | Batch 9 |
| POST | `/runner/location` | Batch 5 |
| POST | `/runner/plans/:id/confirm` | Batch 9 |
| POST | `/runner/plans/:id/late` | Batch 9 |
| POST | `/runner/plans/:id/start` | Batch 9 |
| GET | `/runner/plans/tomorrow` | Batch 9 |
| PATCH | `/runner/prefs` | Batch 8 |
| GET | `/runner/routines` | Batch 9 |
| POST | `/runner/routines` | Batch 9 |
| PATCH | `/runner/routines/:id` | Batch 9 |
| POST | `/runner/routines/pause` | Batch 9 |
| DELETE | `/runner/session` | Batch 5 |
| POST | `/runner/session` | Batch 5 |
| POST | `/runner/session/pause` | Batch 5 |
| POST | `/runner/session/resume` | Batch 6 |
| DELETE | `/safety/contacts` | Batch 8 |
| POST | `/safety/share` | Batch 8 |
| POST | `/safety/sos` | Batch 8 |
| GET | `/skills/categories` | Batch 11 |
| POST | `/sms/inbound` | Batch 3C |
| GET | `/t/:short_code` | Batch 3C |
| POST | `/t/:short_code/call` | Batch 3C |
| GET | `/tasks` | Batch 8 |
| POST | `/tasks` | Batch 3 |
| GET | `/tasks/:id` |  |
| POST | `/tasks/:id/accept` | Batch 5 |
| POST | `/tasks/:id/accept_quote` | Batch 11 |
| POST | `/tasks/:id/approve` | Batch 11 |
| POST | `/tasks/:id/arrived_dropoff` | Batch 6 |
| POST | `/tasks/:id/arrived_pickup` | Batch 6 |
| POST | `/tasks/:id/asks` | Batch 3B |
| POST | `/tasks/:id/asks/:ask_id` | Batch 3B |
| POST | `/tasks/:id/beacon` | Batch 3B |
| POST | `/tasks/:id/beacon_request` | Batch 3B |
| POST | `/tasks/:id/bounty` | Batch 3 |
| POST | `/tasks/:id/call` | Batch 4 |
| POST | `/tasks/:id/cancel` | Batch 3 |
| POST | `/tasks/:id/cash_purchases` | Batch 3B |
| POST | `/tasks/:id/decline` | Batch 5 |
| POST | `/tasks/:id/deliver` | Batch 11 |
| POST | `/tasks/:id/disputes` | Batch 4 |
| POST | `/tasks/:id/issues` | Batch 6 |
| PATCH | `/tasks/:id/items/:item_id` | Batch 3B |
| GET | `/tasks/:id/messages` | Batch 4 |
| POST | `/tasks/:id/messages` | Batch 4 |
| POST | `/tasks/:id/no_show` | Batch 6 |
| POST | `/tasks/:id/pickup` | Batch 6 |
| POST | `/tasks/:id/rating` | Batch 4 |
| GET | `/tasks/:id/receipt` | Batch 4 |
| GET | `/tasks/:id/receipt.pdf` | Batch 4 |
| POST | `/tasks/:id/requester_rating` | Batch 6 |
| POST | `/tasks/:id/runner_cancel` | Batch 6 |
| POST | `/tasks/:id/vendor_payments` | Batch 3B |
| POST | `/tasks/:id/verify_pin` | Batch 3B |
| POST | `/tasks/check` | Batch 3C |
| POST | `/tasks/parse` | Batch 3 |
| GET | `/trips` | Batch 11 |
| POST | `/trips` | Batch 11 |
| POST | `/trips/:id/join` | Batch 11 |
| POST | `/trips/:id/start` | Batch 11 |
| POST | `/users/:id/block` | Batch 8 |
| GET | `/users/:id/public` | Batch 8 |
| POST | `/users/:id/reports` | Batch 8 |
| GET | `/wallet` | Batch 7 |
| GET | `/wallet/holds` | Batch 7 |
| GET | `/wallet/limits` | Batch 5B |
| POST | `/wallet/pin` | Batch 7 |
| POST | `/wallet/pin/reset` | Batch 7 |
| POST | `/wallet/statements` | Batch 7 |
| POST | `/wallet/topups` | Batch 3 |
| GET | `/wallet/transactions` | Batch 7 |
| GET | `/wallet/transactions/:id` | Batch 7 |
| GET | `/wallet/transactions/:id/receipt.pdf` | Batch 7 |
| GET | `/wallet/virtual_account` | Batch 7 |
| POST | `/wallet/withdrawals` | Batch 7 |

## Index: realtime events

`admin.live`, `dispute.updated`, `kyc.updated`, `message.created`, `offer.created`, `offer.expired`, `referral.updated`, `task.beacon`, `task.proximity`, `task.quote`, `task.requester_location`, `task.runner_location`, `task.search_progress`, `task.updated`, `trip.updated`, `wallet.updated`

## Index: payment webhooks

`charge.success`, `transfer.failed`, `transfer.success`
