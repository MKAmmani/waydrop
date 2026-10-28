<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\ExpireCallSession;
use App\Models\Area;
use App\Models\CallSession;
use App\Models\Device;
use App\Models\Dispute;
use App\Models\Place;
use App\Models\Task;
use App\Models\TaskActivity;
use App\Models\TaskMessage;
use App\Models\Transaction;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\Wallet;
use App\Services\AblyService;
use App\Services\AgoraService;
use App\Services\ExpoNotificationService;
use App\Services\NotificationService;
use App\Services\PlatformRevenueService;
use App\Services\SquadService;
use App\Services\ZainpayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class TaskController extends Controller
{
    /**
     * Resolve the requesting user (authenticated Sanctum token or campus demo user).
     */
    private function resolveUser(Request $request): ?User
    {
        $user = $request->user('sanctum');
        if ($user) {
            return $user;
        }

        // Demo fallback: Munir Ammani or any regular user with a wallet
        return User::where('phone', '+2347082262502')->first()
            ?? User::whereHas('wallet')->where('role', '!=', 'platform')->first()
            ?? User::first();
    }

    protected function buyFields(Task $task): array
    {
        $bounty = (int) ($task->bounty_kobo ?? 0);
        $platformFee = (int) ($task->platform_fee_kobo ?: round($bounty * 0.10));

        return [
            'type' => $task->type ?? 'move',
            'platform_fee' => $platformFee,
            'runner_payout_kobo' => $task->runner_payout_kobo,
            'items' => $task->items,
            'source' => $task->source,
            'budget_kobo' => $task->budget_kobo,
            'spent_kobo' => $task->spent_kobo ?? 0,
            'refund_kobo' => $task->refund_kobo ?? 0,
            'rules' => $task->rules,
            'seat_photo' => (bool) $task->seat_photo_url,
            'live_share' => (bool) $task->live_share,
            'beacon_active' => (bool) $task->beacon_active,
            'active_ask' => $task->active_ask,
            'vendor_payment' => $task->vendor_payment,
            'cash_purchase' => $task->cash_purchase,
        ];
    }

    private function authenticatedUser(Request $request): ?User
    {
        return $request->user('sanctum') ?? $request->user();
    }

    private function isTaskParticipant(User $user, Task $task): bool
    {
        return $user->id === $task->requester_id || $user->id === $task->runner_id;
    }

    private function publishNotification(UserNotification $notification): void
    {
        try {
            $ably = app(AblyService::class);
            if ($ably->isConfigured()) {
                $ably->publish("user:{$notification->user_id}", 'notification.created', [
                    'notification' => [
                        'id' => (string) $notification->id,
                        'type' => $notification->type,
                        'title' => $notification->title,
                        'desc' => $notification->body,
                        'read' => false,
                        'created_at' => $notification->created_at?->toIso8601String(),
                        'data' => $notification->data,
                    ],
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('[Notification Broadcast Warning] '.$e->getMessage());
        }
    }

    private function placeMatchesDestination(?string $placeId, ?string $placeName, string $destinationId, string $destinationName): bool
    {
        $placeId = strtolower(trim((string) $placeId));
        $placeName = strtolower(trim((string) $placeName));

        if ($destinationId !== '' && $placeId !== '' && ($placeId === $destinationId || str_contains($placeId, $destinationId) || str_contains($destinationId, $placeId))) {
            return true;
        }

        if ($destinationName === '' || $placeName === '') {
            return false;
        }

        if ($placeName === $destinationName || str_contains($placeName, $destinationName) || str_contains($destinationName, $placeName)) {
            return true;
        }

        foreach (array_filter(explode(' ', $destinationName), fn ($word) => strlen($word) >= 3) as $word) {
            if (str_contains($placeName, $word)) {
                return true;
            }
        }

        return false;
    }

    /**
     * POST /quotes
     */
    public function quote(Request $request): JsonResponse
    {
        $pickup = $request->input('pickup');
        $dropoff = $request->input('dropoff');

        $distance_m = 450;
        if (is_array($pickup) && is_array($dropoff) && isset($pickup['lat'], $dropoff['lat'])) {
            $dx = ((float) $dropoff['lng'] - (float) $pickup['lng']) * 111000;
            $dy = ((float) $dropoff['lat'] - (float) $pickup['lat']) * 111000;
            $distance_m = max(150, (int) hypot($dx, $dy));
        } elseif (is_string($pickup) && is_string($dropoff)) {
            $pPlace = Place::find($pickup);
            $dPlace = Place::find($dropoff);
            if ($pPlace && $dPlace) {
                $dx = ((float) $dPlace->lng - (float) $pPlace->lng) * 111000;
                $dy = ((float) $dPlace->lat - (float) $pPlace->lat) * 111000;
                $distance_m = max(150, (int) hypot($dx, $dy));
            }
        }

        $lo = max(200, (int) (round((150 + $distance_m * 0.35) / 50) * 50)) * 100; // in kobo

        $siteId = $request->input('site_id', 'buk-new');
        $runnersNearby = User::where('runner_status', 'verified')
            ->where('is_blocked', false)
            ->where(function ($q) use ($siteId) {
                $q->where('area_id', $siteId)->orWhereNull('area_id');
            })
            ->count();

        return response()->json([
            'distance_m' => $distance_m,
            'duration_s' => max(120, (int) round($distance_m / 1.3)),
            'suggested_min' => $lo,
            'suggested_max' => $lo * 2,
            'fee_rate' => 0.10,
            'runners_nearby' => $runnersNearby,
            'route' => [],
        ]);
    }

    /**
     * POST /tasks
     */
    public function store(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (! $user) {
            return response()->json([
                'code' => 'UNAUTHENTICATED',
                'message' => 'User not found. Please log in.',
            ], 401);
        }

        $type = (string) ($request->input('type') ?? ($request->has('items') || (int) $request->input('budget_kobo', 0) > 0 ? 'buy' : 'move'));
        $bounty = (int) ($request->input('bounty') ?? 30000);
        $budgetKobo = (int) ($request->input('budget_kobo') ?? 0);
        $totalRequired = $bounty + $budgetKobo;
        $item = (string) $request->input('item', 'Item');
        $note = (string) $request->input('note', '');
        $items = $request->input('items');
        $source = $request->input('source');
        $rules = $request->input('rules');
        $seatPhotoUrl = $request->input('seat_photo_url');
        $liveShare = (bool) $request->input('live_share', false);
        $pickup = $request->input('pickup', []);
        $dropoff = $request->input('dropoff', []);

        // Ensure user wallet exists
        $wallet = $user->wallet;
        if (! $wallet) {
            $wallet = Wallet::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'balance_kobo' => 2500000,
                    'escrow_kobo' => 0,
                    'virtual_account_nuban' => '9948123011',
                    'virtual_bank_name' => 'Wema Bank',
                ]
            );
        }

        // Validate balance before escrow lock
        if ($wallet->balance_kobo < $totalRequired) {
            return response()->json([
                'code' => 'INSUFFICIENT_FUNDS',
                'message' => 'Your wallet is short for this errand. Top up or lower the offer.',
            ], 402);
        }

        // Calculate suggested min
        $suggestedMin = (int) ($request->input('suggested_min') ?? 30000);

        // Resolve pickup and dropoff names and place IDs
        $pickupName = is_array($pickup) ? ($pickup['name'] ?? 'Pickup spot') : (string) $pickup;
        $dropoffName = is_array($dropoff) ? ($dropoff['name'] ?? 'Drop-off spot') : (string) $dropoff;
        $pickupPlaceId = (is_array($pickup) && isset($pickup['id']) && Place::where('id', $pickup['id'])->exists()) ? $pickup['id'] : null;
        $dropoffPlaceId = (is_array($dropoff) && isset($dropoff['id']) && Place::where('id', $dropoff['id'])->exists()) ? $dropoff['id'] : null;

        $pickupLat = is_array($pickup) && isset($pickup['lat']) ? $pickup['lat'] : null;
        $pickupLng = is_array($pickup) && isset($pickup['lng']) ? $pickup['lng'] : null;
        $dropoffLat = is_array($dropoff) && isset($dropoff['lat']) ? $dropoff['lat'] : null;
        $dropoffLng = is_array($dropoff) && isset($dropoff['lng']) ? $dropoff['lng'] : null;

        // Resolve area
        $areaId = $request->input('site_id') ?? $request->input('area_id') ?? $user->area_id ?? 'buk-new';
        if (! Area::where('id', $areaId)->exists()) {
            $areaId = Area::first()?->id ?? 'buk-new';
        }

        $pin = (string) random_int(1000, 9999);
        $taskId = 'WD-'.strtoupper(Str::random(4));
        while (Task::where('id', $taskId)->exists()) {
            $taskId = 'WD-'.strtoupper(Str::random(4));
        }

        // Lock funds into Escrow atomically in a DB transaction
        $task = DB::transaction(function () use (
            $wallet,
            $user,
            $type,
            $bounty,
            $budgetKobo,
            $totalRequired,
            $item,
            $note,
            $items,
            $source,
            $rules,
            $seatPhotoUrl,
            $liveShare,
            $taskId,
            $areaId,
            $pickupPlaceId,
            $pickupName,
            $pickupLat,
            $pickupLng,
            $dropoffPlaceId,
            $dropoffName,
            $dropoffLat,
            $dropoffLng,
            $suggestedMin,
            $pin
        ) {
            $lockedWallet = Wallet::where('id', $wallet->id)->lockForUpdate()->first();
            if ($lockedWallet->balance_kobo < $totalRequired) {
                throw new \RuntimeException('INSUFFICIENT_FUNDS');
            }

            $balanceBefore = $lockedWallet->balance_kobo;
            $lockedWallet->balance_kobo -= $totalRequired;
            $lockedWallet->escrow_kobo += $totalRequired;
            $lockedWallet->save();

            // Create Task record
            $newTask = Task::create([
                'id' => $taskId,
                'type' => $type,
                'requester_id' => $user->id,
                'area_id' => $areaId,
                'item' => $item,
                'note' => $note,
                'items' => $items,
                'source' => $source,
                'rules' => $rules,
                'pickup_place_id' => $pickupPlaceId,
                'pickup_name' => $pickupName,
                'pickup_lat' => $pickupLat,
                'pickup_lng' => $pickupLng,
                'dropoff_place_id' => $dropoffPlaceId,
                'dropoff_name' => $dropoffName,
                'dropoff_lat' => $dropoffLat,
                'dropoff_lng' => $dropoffLng,
                'bounty_kobo' => $bounty,
                'budget_kobo' => $budgetKobo,
                'spent_kobo' => 0,
                'refund_kobo' => 0,
                'suggested_min_kobo' => $suggestedMin,
                'platform_fee_kobo' => (int) round($bounty * 0.10),
                'pin_code' => $pin,
                'seat_photo_url' => $seatPhotoUrl,
                'live_share' => $liveShare,
                'status' => 'pending',
            ]);

            // Escrow Lock financial ledger transaction
            Transaction::create([
                'wallet_id' => $lockedWallet->id,
                'task_id' => $taskId,
                'type' => 'escrow_lock',
                'amount_kobo' => $totalRequired,
                'balance_before_kobo' => $balanceBefore,
                'balance_after_kobo' => $lockedWallet->balance_kobo,
                'reference' => 'WD_ESC_LOCK_'.strtoupper(Str::random(10)),
                'status' => 'success',
                'metadata' => [
                    'task_id' => $taskId,
                    'item' => $item,
                    'type' => $type,
                    'bounty_kobo' => $bounty,
                    'budget_kobo' => $budgetKobo,
                    'reason' => '₦'.number_format($totalRequired / 100).' held safely in escrow for errand '.$taskId,
                ],
            ]);

            // Audit activity log
            TaskActivity::create([
                'task_id' => $taskId,
                'actor_id' => $user->id,
                'event' => 'created',
                'metadata' => [
                    'bounty_kobo' => $bounty,
                    'escrow_locked' => true,
                    'pickup' => $pickupName,
                    'dropoff' => $dropoffName,
                ],
            ]);

            return $newTask;
        });

        // Dispatch a high-priority push notification only to eligible runners in this campus.
        $notificationResult = ['sent' => 0];
        try {
            $notificationResult = app(ExpoNotificationService::class)->notifyNearbyRunners($areaId, $task);
        } catch (\Throwable $e) {
            // Silently continue without blocking task creation
        }

        $wallet->refresh();

        // Broadcast real-time errand creation to campus runners stream via Ably
        try {
            $ably = app(AblyService::class);
            if ($ably->isConfigured() && $task->area_id) {
                $createdPayload = [
                    'id' => $task->id,
                    'item' => $task->item,
                    'note' => $task->note,
                    'pickup' => ['id' => $task->pickup_place_id ?? 'here', 'name' => $task->pickup_name],
                    'dropoff' => ['id' => $task->dropoff_place_id ?? 'dest', 'name' => $task->dropoff_name],
                    'bounty' => $task->bounty_kobo,
                    'suggested_min' => $task->suggested_min_kobo,
                    'area_id' => $task->area_id,
                    'created_at' => (int) ($task->created_at->timestamp * 1000),
                    'requester_id' => (string) $task->requester_id,
                ];
                $ably->publish("campus:{$task->area_id}:errands", 'task.created', $createdPayload);
            }
        } catch (\Throwable $e) {
        }

        return response()->json(array_merge([
            'id' => $task->id,
            'status' => 'pending',
            'item' => $task->item,
            'note' => $task->note,
            'pickup' => [
                'id' => $task->pickup_place_id ?? 'here',
                'name' => $task->pickup_name,
            ],
            'dropoff' => [
                'id' => $task->dropoff_place_id ?? 'dest',
                'name' => $task->dropoff_name,
            ],
            'bounty' => $task->bounty_kobo,
            'suggested_min' => $task->suggested_min_kobo,
            'pin' => $task->pin_code, // decrypted by cast
            'created_at' => (int) ($task->created_at->timestamp * 1000),
            'search' => [
                'notified' => (int) ($notificationResult['sent'] ?? 0),
                'viewing' => 0,
                'viewing_runner' => null,
                'viewing_runners' => [],
                'no_match' => false,
            ],
            'runner' => null,
            'balance_after' => $wallet->balance_kobo,
        ], $this->buyFields($task)), 201);
    }

    /**
     * GET /tasks/{id}
     */
    public function show(string $id, Request $request): JsonResponse
    {
        $task = Task::with(['requester.wallet', 'runner', 'area'])->find($id);

        if (! $task) {
            return response()->json([
                'code' => 'NOT_FOUND',
                'message' => 'Errand not found.',
            ], 404);
        }

        $requesterWallet = $task->requester?->wallet;
        $balanceAfter = $requesterWallet ? $requesterWallet->balance_kobo : 0;

        // If task is cancelled
        if ($task->status === 'cancelled') {
            return response()->json(array_merge([
                'id' => $task->id,
                'status' => 'cancelled',
                'item' => $task->item,
                'note' => $task->note,
                'pickup' => [
                    'id' => $task->pickup_place_id ?? 'here',
                    'name' => $task->pickup_name,
                ],
                'dropoff' => [
                    'id' => $task->dropoff_place_id ?? 'dest',
                    'name' => $task->dropoff_name,
                ],
                'bounty' => $task->bounty_kobo,
                'suggested_min' => $task->suggested_min_kobo,
                'pin' => $task->pin_code,
                'created_at' => (int) ($task->created_at->timestamp * 1000),
                'search' => [
                    'notified' => 0,
                    'viewing' => 0,
                    'viewing_runner' => null,
                    'no_match' => true,
                ],
                'runner' => null,
                'balance_after' => $balanceAfter,
            ], $this->buyFields($task)));
        }

        // If task is already accepted/shopping/bought/in_transit/picked_up/arrived/completed/disputed
        if (in_array($task->status, ['accepted', 'shopping', 'bought', 'in_transit', 'picked_up', 'arrived', 'completed', 'disputed'], true)) {
            $runner = $task->runner;

            $pickupLat = $task->pickup_lat !== null ? (float) $task->pickup_lat : null;
            $pickupLng = $task->pickup_lng !== null ? (float) $task->pickup_lng : null;
            $dropoffLat = $task->dropoff_lat !== null ? (float) $task->dropoff_lat : null;
            $dropoffLng = $task->dropoff_lng !== null ? (float) $task->dropoff_lng : null;

            $unreadCount = TaskMessage::where('task_id', $task->id)->where('is_runner', true)->count();

            return response()->json(array_merge([
                'id' => $task->id,
                'status' => $task->status,
                'item' => $task->item,
                'note' => $task->note,
                'pickup' => [
                    'id' => $task->pickup_place_id ?? 'here',
                    'name' => $task->pickup_name,
                    'lat' => $pickupLat,
                    'lng' => $pickupLng,
                ],
                'dropoff' => [
                    'id' => $task->dropoff_place_id ?? 'dest',
                    'name' => $task->dropoff_name,
                    'lat' => $dropoffLat,
                    'lng' => $dropoffLng,
                ],
                'bounty' => $task->bounty_kobo,
                'platform_fee' => $task->platform_fee_kobo ?: (int) round($task->bounty_kobo * 0.10),
                'suggested_min' => $task->suggested_min_kobo,
                'pin' => $task->pin_code,
                'created_at' => (int) ($task->created_at->timestamp * 1000),
                'accepted_at' => $task->accepted_at ? (int) ($task->accepted_at->timestamp * 1000) : null,
                'picked_up_at' => $task->picked_up_at ? (int) ($task->picked_up_at->timestamp * 1000) : null,
                'arrived_at' => $task->arrived_at ? (int) ($task->arrived_at->timestamp * 1000) : null,
                'completed_at' => $task->completed_at ? (int) ($task->completed_at->timestamp * 1000) : null,
                'pickup_photo_url' => $task->pickup_photo_url,
                'dropoff_photo_url' => $task->dropoff_photo_url,
                'rating' => $task->rating,
                'rating_tags' => $task->rating_tags ?? [],
                'rating_note' => $task->rating_note,
                'tip_kobo' => $task->tip_kobo ?? 0,
                'is_late' => (bool) $task->is_late,
                'unread_messages_count' => $unreadCount,
                'search' => [
                    'viewing' => 0,
                    'viewing_runner' => null,
                    'viewing_runners' => [],
                    'no_match' => false,
                ],
                'runner' => $runner ? [
                    'id' => $runner->id,
                    'name' => trim(($runner->first_name ?? '').' '.($runner->last_name ?? '')) ?: 'Runner',
                    'first_name' => $runner->first_name ?? 'Runner',
                    'last_name' => $runner->last_name ?? '',
                    'rating' => (float) ($runner->rating ?? 4.90),
                    'trips' => (int) ($runner->trips_count ?? 0),
                    'trips_count' => (int) ($runner->trips_count ?? 0),
                    'phone_masked' => $runner->phone ? substr($runner->phone, 0, 4).' ••• ••• '.substr($runner->phone, -3) : null,
                    'eta_s' => null,
                    'location' => null,
                ] : null,
                'requester' => [
                    'id' => $task->requester?->id,
                    'name' => trim(($task->requester?->first_name ?? '').' '.($task->requester?->last_name ?? '')) ?: 'Requester',
                    'first_name' => $task->requester?->first_name ?? 'Requester',
                    'last_name' => $task->requester?->last_name ?? '',
                    'phone_masked' => $task->requester?->phone ? substr($task->requester->phone, 0, 4).' ••• ••• '.substr($task->requester->phone, -3) : null,
                ],
                'balance_after' => $balanceAfter,
            ], $this->buyFields($task)));
        }

        // Record viewing if a verified runner (not requester) is viewing this task
        $currentUser = $request->user('sanctum') ?? $request->user();
        if ($currentUser && $currentUser->id !== $task->requester_id && $currentUser->runner_status === 'verified') {
            $viewerKey = "task_viewers:{$task->id}";
            $viewers = Cache::get($viewerKey, []);
            $viewerId = (string) $currentUser->id;
            $previousViewer = $viewers[$viewerId] ?? null;
            $previousViewerCount = count($viewers);
            $viewers[$viewerId] = [
                'name' => $currentUser->first_name,
                'seen_at' => now()->timestamp,
            ];
            Cache::put($viewerKey, $viewers, now()->addMinutes(3));

            $shouldPublishViewerUpdate = ! $previousViewer
                || $previousViewerCount !== count($viewers)
                || now()->timestamp - (int) ($previousViewer['seen_at'] ?? 0) >= 30;

            if ($shouldPublishViewerUpdate) {
                try {
                    $ably = app(AblyService::class);
                    if ($ably->isConfigured()) {
                        $ably->publish("task:{$task->id}", 'task.viewing', [
                            'task_id' => $task->id,
                            'viewing_runner' => $currentUser->first_name,
                            'viewing_count' => count($viewers),
                        ]);
                    }
                } catch (\Throwable $e) {
                }
            }
        }

        $viewers = Cache::get("task_viewers:{$task->id}", []);
        $viewingRunnerNames = array_values(array_filter(array_map(
            static fn ($viewer) => is_array($viewer) ? ($viewer['name'] ?? null) : $viewer,
            $viewers
        )));

        return response()->json(array_merge([
            'id' => $task->id,
            'status' => 'pending',
            'item' => $task->item,
            'note' => $task->note,
            'pickup' => [
                'id' => $task->pickup_place_id ?? 'here',
                'name' => $task->pickup_name,
            ],
            'dropoff' => [
                'id' => $task->dropoff_place_id ?? 'dest',
                'name' => $task->dropoff_name,
            ],
            'bounty' => $task->bounty_kobo,
            'suggested_min' => $task->suggested_min_kobo,
            'pin' => $task->pin_code,
            'created_at' => (int) ($task->created_at->timestamp * 1000),
            'search' => [
                'viewing' => count($viewingRunnerNames),
                'viewing_runner' => $viewingRunnerNames[0] ?? null,
                'viewing_runners' => $viewingRunnerNames,
                'no_match' => false,
            ],
            'runner' => null,
            'requester' => [
                'id' => $task->requester?->id,
                'name' => trim(($task->requester?->first_name ?? '').' '.($task->requester?->last_name ?? '')) ?: 'Requester',
                'first_name' => $task->requester?->first_name ?? 'Requester',
                'last_name' => $task->requester?->last_name ?? '',
                'phone_masked' => $task->requester?->phone ? substr($task->requester->phone, 0, 4).' ••• ••• '.substr($task->requester->phone, -3) : null,
            ],
            'balance_after' => $balanceAfter,
        ], $this->buyFields($task)));
    }

    /**
     * GET /tasks/available
     * Lists active pending campus errands waiting for runners, prioritized by runner heading.
     */
    public function available(Request $request): JsonResponse
    {
        $areaId = $request->input('site_id') ?? $request->input('area_id') ?? 'buk-new';
        $user = $request->user('sanctum') ?? $request->user();

        $destination = trim((string) ($request->input('destination') ?? $request->input('heading') ?? ''));
        $destinationId = trim((string) ($request->input('destination_id') ?? ''));

        $query = Task::where('status', 'pending')
            ->where(function ($q) use ($areaId) {
                $q->where('area_id', $areaId)->orWhereNull('area_id');
            });

        if ($user) {
            $query->where('requester_id', '!=', $user->id);
        }

        $tasks = $query->latest()->take(30)->get();

        $destLower = strtolower($destination);
        $destIdLower = strtolower($destinationId);

        $mappedTasks = $tasks->map(function ($t) use ($destLower, $destIdLower) {
            $isOnRoute = ($destLower !== '' || $destIdLower !== '')
                && ($this->placeMatchesDestination($t->pickup_place_id, $t->pickup_name, $destIdLower, $destLower)
                    || $this->placeMatchesDestination($t->dropoff_place_id, $t->dropoff_name, $destIdLower, $destLower));

            return [
                'id' => $t->id,
                'item' => $t->item,
                'note' => $t->note,
                'pickup' => ['id' => $t->pickup_place_id ?? 'here', 'name' => $t->pickup_name],
                'dropoff' => ['id' => $t->dropoff_place_id ?? 'dest', 'name' => $t->dropoff_name],
                'bounty' => $t->bounty_kobo,
                'suggested_min' => $t->suggested_min_kobo,
                'on_route' => $isOnRoute,
                'created_at' => (int) ($t->created_at->timestamp * 1000),
            ];
        });

        if ($destLower !== '' || $destIdLower !== '') {
            $mappedTasks = $mappedTasks->sortByDesc('on_route')->values();
        }

        return response()->json([
            'count' => $mappedTasks->count(),
            'tasks' => $mappedTasks,
            'heading' => $destination ?: null,
            'on_route_count' => $mappedTasks->where('on_route', true)->count(),
        ]);
    }

    /**
     * POST /tasks/{id}/accept
     * Allows a runner to explicitly accept a pending errand.
     */
    public function accept(Request $request, string $id): JsonResponse
    {
        $task = Task::with('requester.wallet')->findOrFail($id);

        if ($task->status !== 'pending') {
            return response()->json([
                'code' => 'INVALID_STATUS',
                'message' => 'This errand is no longer available to accept.',
            ], 409);
        }

        // Determine runner accepting the errand
        $runner = null;
        if ($request->filled('runner_id')) {
            $runner = User::find($request->input('runner_id'));
        }
        if (! $runner) {
            $runner = $request->user() ?? $request->user('sanctum');
        }
        if ($runner && $runner->id === $task->requester_id) {
            return response()->json([
                'code' => 'CANNOT_ACCEPT_OWN_TASK',
                'message' => 'You cannot accept your own errand.',
            ], 403);
        }

        if (! $runner) {
            // Default to first verified campus runner who is not the requester
            $runner = User::where('runner_status', 'verified')->where('id', '!=', $task->requester_id)->first();
        }

        if (! $runner) {
            return response()->json([
                'code' => 'RUNNER_NOT_FOUND',
                'message' => 'No verified runner account found.',
            ], 404);
        }

        DB::transaction(function () use ($task, $runner) {
            $lockedTask = Task::lockForUpdate()->find($task->id);
            if ($lockedTask->status !== 'pending') {
                throw new \RuntimeException('ALREADY_ACCEPTED');
            }

            $lockedTask->runner_id = $runner->id;
            $lockedTask->status = 'accepted';
            $lockedTask->accepted_at = now();
            $lockedTask->save();

            TaskActivity::create([
                'task_id' => $lockedTask->id,
                'actor_id' => $runner->id,
                'event' => 'accepted',
                'metadata' => [
                    'runner_id' => $runner->id,
                    'runner_name' => "{$runner->first_name} {$runner->last_name}",
                    'eta_s' => 180,
                ],
            ]);

            // Dispatch notification to requester
            if ($lockedTask->requester) {
                try {
                    app(ExpoNotificationService::class)->sendToUser(
                        $lockedTask->requester,
                        '🎉 Runner Found!',
                        "{$runner->first_name} accepted your errand! ETA is ~3 mins.",
                        ['type' => 'errand_accepted', 'task_id' => $lockedTask->id],
                        'errands'
                    );
                } catch (\Throwable $e) {
                }

                UserNotification::create([
                    'user_id' => $lockedTask->requester_id,
                    'type' => 'errand',
                    'title' => 'Runner found!',
                    'body' => "{$runner->first_name} accepted your errand. Handshake PIN: {$lockedTask->pin_code}",
                    'data' => ['task_id' => $lockedTask->id],
                ]);
            }
        });

        // Broadcast real-time Ably events to task, requester, and campus channels
        try {
            $ably = app(AblyService::class);
            if ($ably->isConfigured()) {
                $taskData = $this->show($id, $request)->getData(true);
                $ably->publish("task:{$task->id}", 'task.accepted', $taskData);
                $ably->publish("task:{$task->id}", 'task.updated', $taskData);
                $ably->publish("user:{$task->requester_id}", 'task.accepted', $taskData);
                if ($task->area_id) {
                    $ably->publish("campus:{$task->area_id}:errands", 'task.taken', ['id' => $task->id]);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('[Ably Accept Broadcast Warning] '.$e->getMessage());
        }

        return $this->show($id, $request);
    }

    /**
     * POST /tasks/{id}/bounty
     */
    public function raiseBounty(Request $request, string $id): JsonResponse
    {
        $task = Task::with('requester.wallet')->findOrFail($id);

        if ($task->status !== 'pending') {
            return response()->json([
                'code' => 'INVALID_STATUS',
                'message' => 'Cannot raise bounty on a non-pending errand.',
            ], 400);
        }

        $newBounty = (int) $request->input('bounty', $task->suggested_min_kobo);
        $delta = $newBounty - $task->bounty_kobo;

        if ($delta <= 0) {
            return response()->json([
                'code' => 'INVALID_BOUNTY',
                'message' => 'New bounty must be higher than current bounty.',
            ], 422);
        }

        $wallet = $task->requester?->wallet;
        if (! $wallet || $wallet->balance_kobo < $delta) {
            return response()->json([
                'code' => 'INSUFFICIENT_FUNDS',
                'message' => 'Your wallet is short for this raise. Please top up.',
            ], 402);
        }

        // Lock delta into escrow atomically in a DB transaction
        DB::transaction(function () use ($wallet, $task, $delta, $newBounty) {
            $lockedWallet = Wallet::where('id', $wallet->id)->lockForUpdate()->first();
            if ($lockedWallet->balance_kobo < $delta) {
                throw new \RuntimeException('INSUFFICIENT_FUNDS');
            }

            $balanceBefore = $lockedWallet->balance_kobo;
            $lockedWallet->balance_kobo -= $delta;
            $lockedWallet->escrow_kobo += $delta;
            $lockedWallet->save();

            // Record transaction
            Transaction::create([
                'wallet_id' => $lockedWallet->id,
                'task_id' => $task->id,
                'type' => 'escrow_lock',
                'amount_kobo' => $delta,
                'balance_before_kobo' => $balanceBefore,
                'balance_after_kobo' => $lockedWallet->balance_kobo,
                'reference' => 'WD_ESC_RAISE_'.strtoupper(Str::random(10)),
                'status' => 'success',
                'metadata' => [
                    'task_id' => $task->id,
                    'reason' => '₦'.number_format($delta / 100).' additional escrow held for errand '.$task->id,
                    'new_bounty' => $newBounty,
                ],
            ]);

            // Update task bounty and reset progression timer
            $task->bounty_kobo = $newBounty;
            $task->updated_at = now();
            $task->save();

            TaskActivity::create([
                'task_id' => $task->id,
                'actor_id' => $task->requester_id,
                'event' => 'bounty_raised',
                'metadata' => [
                    'new_bounty_kobo' => $newBounty,
                    'delta_kobo' => $delta,
                ],
            ]);
        });

        // Broadcast notification to runners about raised bounty
        try {
            $bountyNaira = '₦'.number_format($newBounty / 100);
            app(ExpoNotificationService::class)->sendPushNotification(
                Device::pluck('push_token')->all(),
                "🔥 Errand offer raised: {$bountyNaira}",
                "{$task->item} offer raised to {$bountyNaira}. Tap to accept.",
                ['type' => 'bounty_raised', 'task_id' => $task->id, 'bounty' => $newBounty],
                'errands'
            );
        } catch (\Throwable $e) {
        }

        // Broadcast bounty raise to campus runners via Ably
        try {
            $ably = app(AblyService::class);
            if ($ably->isConfigured()) {
                $ably->publish("campus:{$task->area_id}:errands", 'task.bounty_raised', [
                    'id' => $task->id,
                    'bounty' => $newBounty,
                ]);
            }
        } catch (\Throwable $e) {
        }

        return $this->show($id, $request);
    }

    /**
     * POST /tasks/{id}/cancel
     */
    public function cancel(Request $request, string $id): JsonResponse
    {
        $task = Task::with('requester.wallet')->findOrFail($id);

        if ($task->status === 'cancelled') {
            return response()->json([
                'id' => $task->id,
                'status' => 'cancelled',
                'message' => 'Errand already cancelled. Funds refunded to wallet.',
            ]);
        }

        if ($task->status !== 'pending') {
            return response()->json([
                'code' => $task->status === 'accepted' ? 'ALREADY_ACCEPTED' : 'NOT_CANCELLABLE',
                'message' => 'This errand is already in progress. Contact campus support to cancel.',
            ], 409);
        }

        // The whole escrow (runner bounty + shopping budget) belongs to this pending errand.
        $escrowHeld = $task->bounty_kobo + $task->budget_kobo;
        $refundedKobo = 0;

        // Atomically refund escrow to user balance in a DB transaction
        $wallet = DB::transaction(function () use ($task, $escrowHeld, &$refundedKobo) {
            $userWallet = Wallet::where('user_id', $task->requester_id)->lockForUpdate()->first();
            if ($userWallet) {
                $refundedKobo = min($escrowHeld, $userWallet->escrow_kobo);
                $balanceBefore = $userWallet->balance_kobo;
                $userWallet->escrow_kobo -= $refundedKobo;
                $userWallet->balance_kobo += $refundedKobo;
                $userWallet->save();

                // Record financial refund ledger entry
                Transaction::create([
                    'wallet_id' => $userWallet->id,
                    'task_id' => $task->id,
                    'type' => 'escrow_refund',
                    'amount_kobo' => $refundedKobo,
                    'balance_before_kobo' => $balanceBefore,
                    'balance_after_kobo' => $userWallet->balance_kobo,
                    'reference' => 'WD_ESC_REF_'.strtoupper(Str::random(10)),
                    'status' => 'success',
                    'metadata' => [
                        'task_id' => $task->id,
                        'reason' => '₦'.number_format($refundedKobo / 100).' refunded from escrow for cancelled errand '.$task->id,
                    ],
                ]);
            }

            $task->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => 'Cancelled by requester',
            ]);

            TaskActivity::create([
                'task_id' => $task->id,
                'actor_id' => $task->requester_id,
                'event' => 'cancelled',
                'metadata' => [
                    'refunded_kobo' => $refundedKobo,
                    'reason' => 'Cancelled by requester before acceptance',
                ],
            ]);

            return $userWallet;
        });

        // Notify user of complete refund
        try {
            if ($task->requester) {
                $refundNaira = '₦'.number_format($refundedKobo / 100);
                app(ExpoNotificationService::class)->sendToUser(
                    $task->requester,
                    'Errand cancelled',
                    "Your errand was cancelled. {$refundNaira} has been returned safely to your wallet.",
                    ['type' => 'task_cancelled', 'task_id' => $task->id],
                    'errands'
                );

                UserNotification::create([
                    'user_id' => $task->requester_id,
                    'type' => 'money',
                    'title' => 'Refund processed',
                    'body' => "{$refundNaira} refunded to your wallet for cancelled errand {$task->id}.",
                    'data' => ['task_id' => $task->id],
                ]);
            }
        } catch (\Throwable $e) {
        }

        // Broadcast cancellation event via Ably
        try {
            $ably = app(AblyService::class);
            if ($ably->isConfigured()) {
                $cancelData = ['id' => $task->id, 'status' => 'cancelled'];
                $ably->publish("task:{$task->id}", 'task.cancelled', $cancelData);
                $ably->publish("task:{$task->id}", 'task.updated', $cancelData);
                $ably->publish("user:{$task->requester_id}", 'task.cancelled', $cancelData);
                if ($task->area_id) {
                    $ably->publish("campus:{$task->area_id}:errands", 'task.cancelled', ['id' => $task->id]);
                }
            }
        } catch (\Throwable $e) {
        }

        return response()->json([
            'id' => $task->id,
            'status' => 'cancelled',
            'message' => 'Errand cancelled. Funds refunded to wallet balance.',
            'bounty' => $task->bounty_kobo,
            'balance_after' => $wallet ? $wallet->balance_kobo : 0,
        ]);
    }

    /**
     * POST /wallet/topups
     */
    public function topup(Request $request): JsonResponse
    {
        $amount = (int) ($request->input('amount') ?? 100000);
        $user = $this->resolveUser($request);

        if (! $user) {
            return response()->json([
                'code' => 'UNAUTHENTICATED',
                'message' => 'User not found.',
            ], 401);
        }

        $wallet = DB::transaction(function () use ($user, $amount, $request) {
            $w = Wallet::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'balance_kobo' => 0,
                    'escrow_kobo' => 0,
                    'virtual_account_nuban' => '9948123011',
                    'virtual_bank_name' => 'Wema Bank',
                ]
            );

            $lockedWallet = Wallet::where('id', $w->id)->lockForUpdate()->first();
            $balanceBefore = $lockedWallet->balance_kobo;
            $lockedWallet->balance_kobo += $amount;
            $lockedWallet->save();

            Transaction::create([
                'wallet_id' => $lockedWallet->id,
                'type' => 'deposit',
                'amount_kobo' => $amount,
                'balance_before_kobo' => $balanceBefore,
                'balance_after_kobo' => $lockedWallet->balance_kobo,
                'reference' => 'WD_DEP_'.strtoupper(Str::random(10)),
                'status' => 'success',
                'metadata' => [
                    'channel' => $request->input('method', 'transfer'),
                    'bank' => $lockedWallet->virtual_bank_name,
                ],
            ]);

            return $lockedWallet;
        });

        return response()->json([
            'balance_kobo' => $wallet->balance_kobo,
            'transaction_id' => 'TXN_'.strtoupper(Str::random(8)),
            'message' => 'Wallet topped up successfully.',
        ]);
    }

    /**
     * GET /banks
     */
    public function banks(Request $request): JsonResponse
    {
        $providerResults = [
            'squad' => $this->cachedBankProviderResult(
                'squad',
                fn (): array => app(SquadService::class)->getBanks(),
            ),
            'zainpay' => $this->cachedBankProviderResult(
                'zainpay',
                fn (): array => app(ZainpayService::class)->getBanks(),
            ),
        ];

        $banksByName = [];
        foreach ($providerResults as $provider => $result) {
            if (! ($result['success'] ?? false)) {
                continue;
            }

            foreach ($result['data'] ?? [] as $bank) {
                $code = trim((string) ($bank['code'] ?? ''));
                $name = trim((string) ($bank['name'] ?? ''));
                $nipCode = trim((string) ($bank['nip_code'] ?? $code));

                if ($code === '' || $name === '' || $nipCode === '') {
                    continue;
                }

                $nameKey = $this->normalizeBankSearch($name);
                if ($nameKey === '' || isset($banksByName[$nameKey])) {
                    continue;
                }

                $banksByName[$nameKey] = [
                    'code' => $code,
                    'name' => $name,
                    'nip_code' => $nipCode,
                    'provider' => $provider,
                ];
            }
        }

        if ($banksByName === []) {
            foreach ($providerResults as $result) {
                if (! ($result['configuration'] ?? false)) {
                    return $this->gatewayErrorResponse($result);
                }
            }

            return $this->gatewayErrorResponse(reset($providerResults));
        }

        $query = strtolower(trim((string) $request->query('q', '')));
        $normalizedQuery = $this->normalizeBankSearch($query);
        $banks = collect(array_values($banksByName))
            ->when($query !== '', fn ($items) => $items->filter(
                fn (array $bank): bool => str_contains($this->normalizeBankSearch($bank['name']), $normalizedQuery)
            ))
            ->values()
            ->all();

        return response()->json(['banks' => $banks]);
    }

    /**
     * GET /banks/resolve
     */
    public function resolveBank(Request $request): JsonResponse
    {
        $account = preg_replace('/\D/', '', (string) $request->query('account', ''));
        $bankCode = trim((string) ($request->query('bank_code') ?: $request->query('bank', '')));
        if (strlen($account) !== 10) {
            return response()->json([
                'code' => 'INVALID_ACCOUNT',
                'message' => 'Enter a 10-digit NUBAN account number.',
            ], 422);
        }

        if ($bankCode === '') {
            return response()->json([
                'code' => 'INVALID_BANK',
                'message' => 'Select the seller bank.',
            ], 422);
        }

        // Bank directories may come from multiple providers, but every account name enquiry is
        // intentionally handled by Zainpay so its sandbox and live responses pass through unchanged.
        $result = app(ZainpayService::class)->validateAccount($account, $bankCode);

        if ($result['success'] ?? false) {
            return response()->json([
                ...($result['data'] ?? []),
                'provider' => 'zainpay',
            ]);
        }

        return $this->gatewayErrorResponse($result);
    }

    private function normalizeBankSearch(string $value): string
    {
        return (string) preg_replace('/[^a-z0-9]+/', '', strtolower($value));
    }

    /**
     * Bank directories change infrequently, and fetching them for every search keystroke makes a slow
     * provider block the mobile client. Only successful, non-empty provider responses are cached.
     *
     * @param  callable(): array  $loader
     * @return array<string, mixed>
     */
    private function cachedBankProviderResult(string $provider, callable $loader): array
    {
        $baseUrl = $provider === 'squad'
            ? (string) config('services.squad.base_url')
            : (string) config('services.zainpay.base_url');
        $cacheKey = 'bank-directory:v3:'.$provider.':'.md5($baseUrl);
        $cached = Cache::get($cacheKey);

        if (is_array($cached)) {
            return $cached;
        }

        $result = $loader();
        if (($result['success'] ?? false) && ! empty($result['data'])) {
            Cache::put($cacheKey, $result, now()->addMinutes(15));
        }

        return $result;
    }

    /**
     * @param  array{success: false, message?: string, configuration?: bool}  $result
     */
    private function gatewayErrorResponse(array $result): JsonResponse
    {
        if ($result['configuration'] ?? false) {
            return response()->json([
                'code' => 'GATEWAY_NOT_CONFIGURED',
                'message' => $result['message'] ?? 'Payment gateway is not configured.',
            ], 503);
        }

        return response()->json([
            'code' => 'BANK_LOOKUP_FAILED',
            'message' => $result['message'] ?? 'Could not reach payment gateway. Try again shortly.',
        ], 422);
    }

    /**
     * POST /tasks/{id}/vendor_payments
     */
    public function payVendor(Request $request, string $id): JsonResponse
    {
        $task = Task::with('requester.wallet')->find($id);
        if (! $task) {
            return response()->json(['code' => 'NOT_FOUND', 'message' => 'Task not found.'], 404);
        }

        $payload = $request->validate([
            'amount_kobo' => ['required', 'integer', 'min:1'],
            'bank' => ['required', 'string', 'max:120'],
            'bank_code' => ['nullable', 'string', 'max:20'],
            'account' => ['required', 'string', 'size:10'],
            'account_name' => ['required', 'string', 'max:255'],
            'receipt_photo' => ['required', 'string', 'max:2048'],
        ]);

        $amountKobo = (int) $payload['amount_kobo'];
        $bank = (string) $payload['bank'];
        $bankCode = (string) ($payload['bank_code'] ?? '');
        $account = (string) $payload['account'];
        $accountName = (string) $payload['account_name'];
        $receiptPhoto = (string) $payload['receipt_photo'];

        $budgetKobo = $task->budget_kobo ?: 200000;
        if ($amountKobo > $budgetKobo) {
            return response()->json([
                'code' => 'OVER_BUDGET',
                'message' => 'Amount exceeds the errand budget.',
            ], 422);
        }

        $refundKobo = max(0, $budgetKobo - $amountKobo);

        DB::transaction(function () use ($task, $amountKobo, $refundKobo, $bank, $bankCode, $account, $accountName, $receiptPhoto) {
            $task->spent_kobo = $amountKobo;
            $task->refund_kobo = $refundKobo;
            $task->status = 'bought';
            $task->vendor_payment = [
                'bank' => $bank,
                'bank_code' => $bankCode,
                'account_number' => $account,
                'account_name' => $accountName,
                'amount_kobo' => $amountKobo,
                'receipt_url' => $receiptPhoto,
                'paid_at' => now()->toIso8601String(),
            ];
            $task->save();

            // Release spent budget and instant refund of remaining budget back to requester wallet
            if ($task->requester?->wallet) {
                $wallet = Wallet::where('id', $task->requester->wallet->id)->lockForUpdate()->first();
                $wallet->escrow_kobo = max(0, $wallet->escrow_kobo - ($amountKobo + $refundKobo));
                if ($refundKobo > 0) {
                    $wallet->balance_kobo += $refundKobo;
                }
                $wallet->save();

                if ($refundKobo > 0) {
                    Transaction::create([
                        'wallet_id' => $wallet->id,
                        'task_id' => $task->id,
                        'type' => 'escrow_refund',
                        'amount_kobo' => $refundKobo,
                        'balance_before_kobo' => $wallet->balance_kobo - $refundKobo,
                        'balance_after_kobo' => $wallet->balance_kobo,
                        'reference' => 'WD_REF_'.strtoupper(Str::random(10)),
                        'status' => 'success',
                        'metadata' => [
                            'task_id' => $task->id,
                            'reason' => 'Unspent budget of ₦'.number_format($refundKobo / 100).' refunded instantly',
                        ],
                    ]);
                }
            }
        });

        return response()->json([
            'success' => true,
            'spent_kobo' => $amountKobo,
            'refund_kobo' => $refundKobo,
            'status' => 'bought',
        ]);
    }

    /**
     * POST /tasks/{id}/cash_purchases
     */
    public function logCash(Request $request, string $id): JsonResponse
    {
        $task = Task::with('requester.wallet')->find($id);
        if (! $task) {
            return response()->json(['code' => 'NOT_FOUND', 'message' => 'Task not found.'], 404);
        }

        $payload = $request->validate([
            'amount_kobo' => ['required', 'integer', 'min:1'],
            'receipt_photo' => ['required', 'string', 'max:2048'],
        ]);

        $amountKobo = (int) $payload['amount_kobo'];
        $receiptPhoto = (string) $payload['receipt_photo'];

        if ($amountKobo > 300000) {
            return response()->json([
                'code' => 'CASH_LIMIT_EXCEEDED',
                'message' => 'Cash is capped at ₦3,000 per errand.',
            ], 422);
        }

        $budgetKobo = $task->budget_kobo ?: 200000;
        $refundKobo = max(0, $budgetKobo - $amountKobo);

        DB::transaction(function () use ($task, $amountKobo, $refundKobo, $receiptPhoto) {
            $task->spent_kobo = $amountKobo;
            $task->refund_kobo = $refundKobo;
            $task->status = 'bought';
            $task->cash_purchase = [
                'amount_kobo' => $amountKobo,
                'receipt_url' => $receiptPhoto,
                'logged_at' => now()->toIso8601String(),
            ];
            $task->save();

            // Instant refund of remaining budget
            if ($refundKobo > 0 && $task->requester?->wallet) {
                $wallet = Wallet::where('id', $task->requester->wallet->id)->lockForUpdate()->first();
                $wallet->escrow_kobo = max(0, $wallet->escrow_kobo - $refundKobo);
                $wallet->balance_kobo += $refundKobo;
                $wallet->save();
            }
        });

        return response()->json([
            'success' => true,
            'reimbursable_kobo' => $amountKobo,
            'status' => 'bought',
        ]);
    }

    /**
     * POST /tasks/{id}/beacon
     */
    public function toggleBeacon(Request $request, string $id): JsonResponse
    {
        $task = Task::find($id);
        if (! $task) {
            return response()->json(['code' => 'NOT_FOUND', 'message' => 'Task not found.'], 404);
        }

        $task->beacon_active = (bool) $request->input('on', true);
        $task->save();

        try {
            $ably = app(AblyService::class);
            if ($ably->isConfigured()) {
                $ably->publish("task:{$task->id}", 'beacon.toggled', [
                    'task_id' => $task->id,
                    'beacon_active' => $task->beacon_active,
                ]);
            }
        } catch (\Throwable $e) {
        }

        return response()->json([
            'beacon_active' => $task->beacon_active,
        ]);
    }

    /**
     * POST /tasks/{id}/beacon_request
     */
    public function askBeacon(Request $request, string $id): JsonResponse
    {
        $task = Task::find($id);
        if (! $task) {
            return response()->json(['code' => 'NOT_FOUND', 'message' => 'Task not found.'], 404);
        }

        $task->beacon_active = true;
        $task->save();

        try {
            $ably = app(AblyService::class);
            if ($ably->isConfigured()) {
                $ably->publish("task:{$task->id}", 'beacon.toggled', [
                    'task_id' => $task->id,
                    'beacon_active' => true,
                ]);
                $ably->publish("user:{$task->requester_id}", 'beacon.toggled', [
                    'task_id' => $task->id,
                    'beacon_active' => true,
                ]);
            }
        } catch (\Throwable $e) {
        }

        return response()->json(['success' => true]);
    }

    /**
     * POST /tasks/{id}/asks
     */
    public function createAsk(Request $request, string $id): JsonResponse
    {
        $task = Task::find($id);
        if (! $task) {
            return response()->json(['code' => 'NOT_FOUND', 'message' => 'Task not found.'], 404);
        }

        $askId = 'ASK_'.strtoupper(Str::random(6));
        $task->active_ask = [
            'id' => $askId,
            'type' => $request->input('type', 'price'),
            'item_name' => $request->input('item_name', 'Bottled water'),
            'diff_kobo' => (int) ($request->input('diff_kobo') ?? 10000),
            'new_price_kobo' => (int) ($request->input('new_price_kobo') ?? 35000),
            'replacement' => $request->input('replacement'),
            'expires_at' => now()->addMinutes(2)->timestamp * 1000,
        ];
        $task->save();

        try {
            $ably = app(AblyService::class);
            if ($ably->isConfigured()) {
                $taskData = $this->show($id, $request)->getData(true);
                $ably->publish("task:{$task->id}", 'task.updated', $taskData);
                $ably->publish("task:{$task->id}", 'ask.created', $task->active_ask);
                $ably->publish("user:{$task->requester_id}", 'task.updated', $taskData);
            }
        } catch (\Throwable $e) {
        }

        return response()->json(['ask_id' => $askId], 201);
    }

    /**
     * POST /tasks/{id}/asks/{askId}
     */
    public function answerAsk(Request $request, string $id, string $askId): JsonResponse
    {
        $task = Task::with('requester.wallet')->find($id);
        if (! $task) {
            return response()->json(['code' => 'NOT_FOUND', 'message' => 'Task not found.'], 404);
        }

        $answer = $request->input('answer', 'approve');
        if ($answer === 'approve' && isset($task->active_ask['diff_kobo'])) {
            $diff = (int) $task->active_ask['diff_kobo'];
            if ($task->requester?->wallet && $diff > 0) {
                $wallet = Wallet::where('id', $task->requester->wallet->id)->lockForUpdate()->first();
                if ($wallet->balance_kobo >= $diff) {
                    $wallet->balance_kobo -= $diff;
                    $wallet->escrow_kobo += $diff;
                    $wallet->save();
                    $task->budget_kobo += $diff;
                }
            }
        }

        $task->active_ask = null;
        $task->save();

        try {
            $ably = app(AblyService::class);
            if ($ably->isConfigured()) {
                $taskData = $this->show($id, $request)->getData(true);
                $ably->publish("task:{$task->id}", 'task.updated', $taskData);
                $ably->publish("task:{$task->id}", 'ask.answered', ['answer' => $answer, 'budget_kobo' => $task->budget_kobo]);
                if ($task->runner_id) {
                    $ably->publish("user:{$task->runner_id}", 'task.updated', $taskData);
                }
            }
        } catch (\Throwable $e) {
        }

        return response()->json([
            'success' => true,
            'budget_kobo' => $task->budget_kobo,
        ]);
    }

    /**
     * PATCH /tasks/{id}/items/{itemIndex}
     */
    public function updateItem(Request $request, string $id, int $itemIndex): JsonResponse
    {
        $task = Task::find($id);
        if (! $task) {
            return response()->json(['code' => 'NOT_FOUND', 'message' => 'Task not found.'], 404);
        }

        $items = $task->items ?: [
            [
                'name' => $task->item,
                'qty' => 1,
                'est' => (int) round(($task->budget_kobo ?: 0) / 100),
                'got' => false,
                'det' => $task->note ?? '',
            ],
        ];
        if (isset($items[$itemIndex])) {
            $items[$itemIndex]['got'] = (bool) $request->input('got', true);
            if ($request->has('price')) {
                $items[$itemIndex]['real_price'] = (int) $request->input('price');
            }
            $task->items = $items;
            $task->save();

            // Broadcast real-time item status to requester
            try {
                $ably = app(AblyService::class);
                if ($ably->isConfigured()) {
                    $taskData = $this->show($id, $request)->getData(true);
                    $ably->publish("task:{$task->id}", 'task.updated', $taskData);
                    $ably->publish("user:{$task->requester_id}", 'task.updated', $taskData);
                }
            } catch (\Throwable $e) {
            }
        }

        return response()->json(['success' => true, 'items' => $items]);
    }

    /**
     * POST /tasks/{id}/progress
     * Updates delivery phase or runner coordinates (Batch 4 Live Tracking).
     */
    public function progress(Request $request, string $id): JsonResponse
    {
        $task = Task::with(['requester', 'runner'])->findOrFail($id);
        $phase = $request->input('phase'); // 'accepted', 'shopping', 'bought', 'in_transit', 'arrived', 'delivered'

        if (in_array($phase, ['shopping', 's1_store_checklist'], true)) {
            $task->status = 'shopping';
        } elseif (in_array($phase, ['bought', 'paid_vendor'], true)) {
            $task->status = 'bought';
        } elseif (in_array($phase, ['in_transit', 'to_you', 's6_en_route', 'photo_proof', 's4_photo_proof'], true)) {
            $task->status = 'in_transit';
            if (! $task->picked_up_at) {
                $task->picked_up_at = now();
            }
            if ($request->filled('pickup_photo_url')) {
                $task->pickup_photo_url = $request->input('pickup_photo_url');
            } elseif (! $task->pickup_photo_url) {
                $task->pickup_photo_url = 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600&auto=format&fit=crop&q=80';
            }
        } elseif (in_array($phase, ['arrived', 's7_arrived'], true)) {
            $task->arrived_at = now();
        } elseif (in_array($phase, ['delivered', 's10_delivered'], true)) {
            if ($task->status !== 'completed') {
                $task->status = 'completed';
                $task->completed_at = now();
            }
        }

        if ($request->has('is_late')) {
            $task->is_late = (bool) $request->input('is_late');
        }

        $task->save();

        // Broadcast real-time Ably events for status progression
        try {
            $ably = app(AblyService::class);
            if ($ably->isConfigured()) {
                $taskData = $this->show($id, $request)->getData(true);
                $ably->publish("task:{$task->id}", 'task.updated', $taskData);
                $ably->publish("user:{$task->requester_id}", 'task.updated', $taskData);
            }
        } catch (\Throwable $e) {
        }

        return $this->show($id, $request);
    }

    /**
     * POST /tasks/{id}/pickup
     * Runner confirms item collection with photo proof.
     */
    public function pickup(Request $request, string $id): JsonResponse
    {
        $task = Task::with(['requester', 'runner'])->findOrFail($id);

        if ($task->status === 'cancelled') {
            return response()->json(['code' => 'INVALID_STATUS', 'message' => 'Errand was cancelled.'], 400);
        }

        $photoUrl = $request->input('pickup_photo_url') ?? $request->input('photo_url');

        $task->status = 'in_transit';
        $task->picked_up_at = now();
        $task->pickup_photo_url = $photoUrl;
        $task->save();

        TaskActivity::create([
            'task_id' => $task->id,
            'actor_id' => $task->runner_id ?? $task->requester_id,
            'event' => 'picked_up',
            'metadata' => [
                'pickup_photo_url' => $photoUrl,
                'timestamp' => now()->toIso8601String(),
            ],
        ]);

        try {
            if ($task->requester) {
                $runnerName = $task->runner?->first_name ?? 'Your runner';
                app(ExpoNotificationService::class)->sendToUser(
                    $task->requester,
                    '📦 Item picked up!',
                    "{$runnerName} collected {$task->item} and is heading to {$task->dropoff_name}.",
                    ['type' => 'task_picked_up', 'task_id' => $task->id],
                    'errands'
                );

                UserNotification::create([
                    'user_id' => $task->requester_id,
                    'type' => 'errand',
                    'title' => 'Item picked up!',
                    'body' => "{$runnerName} verified your item with photo proof. On the way to {$task->dropoff_name}.",
                    'data' => ['task_id' => $task->id],
                ]);
            }
        } catch (\Throwable $e) {
        }

        // Broadcast real-time Ably events for pickup
        try {
            $ably = app(AblyService::class);
            if ($ably->isConfigured()) {
                $taskData = $this->show($id, $request)->getData(true);
                $ably->publish("task:{$task->id}", 'task.updated', $taskData);
                $ably->publish("user:{$task->requester_id}", 'task.updated', $taskData);
            }
        } catch (\Throwable $e) {
        }

        return $this->show($id, $request);
    }

    /**
     * POST /tasks/{id}/delivery-photo
     * Runner captures proof of the item at handover.
     */
    public function uploadDeliveryPhoto(Request $request, string $id): JsonResponse
    {
        $user = $this->authenticatedUser($request);
        if (! $user) {
            return response()->json(['code' => 'UNAUTHENTICATED', 'message' => 'Sign in to upload delivery proof.'], 401);
        }

        $task = Task::find($id);
        if (! $task) {
            return response()->json(['code' => 'NOT_FOUND', 'message' => 'Task not found.'], 404);
        }

        if (! $this->isTaskParticipant($user, $task)) {
            return response()->json(['code' => 'FORBIDDEN', 'message' => 'Only the sender and runner can upload proof.'], 403);
        }

        if ($task->runner_id !== $user->id) {
            return response()->json(['code' => 'FORBIDDEN', 'message' => 'Only the runner can upload delivery proof.'], 403);
        }

        if ($task->status === 'cancelled') {
            return response()->json(['code' => 'INVALID_STATUS', 'message' => 'Errand was cancelled.'], 400);
        }

        $request->validate([
            'photo' => ['required', 'image', 'max:10240'],
        ]);

        $path = $request->file('photo')->store('delivery-proofs', 'public');
        $photoUrl = asset('storage/'.$path);

        $task->dropoff_photo_url = $photoUrl;
        $task->save();

        TaskActivity::create([
            'task_id' => $task->id,
            'actor_id' => $user->id,
            'event' => 'delivery_photo_uploaded',
            'metadata' => [
                'dropoff_photo_url' => $photoUrl,
                'timestamp' => now()->toIso8601String(),
            ],
        ]);

        return response()->json(['dropoff_photo_url' => $photoUrl]);
    }

    /**
     * POST /tasks/{id}/arrive
     * Runner confirms arrival at dropoff location.
     */
    public function arrive(Request $request, string $id): JsonResponse
    {
        $task = Task::with(['requester', 'runner'])->findOrFail($id);

        $task->arrived_at = now();
        $task->save();

        TaskActivity::create([
            'task_id' => $task->id,
            'actor_id' => $task->runner_id ?? $task->requester_id,
            'event' => 'runner_arrived',
            'metadata' => [
                'arrived_at' => now()->toIso8601String(),
            ],
        ]);

        try {
            if ($task->requester) {
                $runnerName = $task->runner?->first_name ?? 'Your runner';
                app(ExpoNotificationService::class)->sendToUser(
                    $task->requester,
                    '📍 Runner has arrived!',
                    "{$runnerName} is at {$task->dropoff_name}. Read out your 4-digit PIN to collect.",
                    ['type' => 'runner_arrived', 'task_id' => $task->id],
                    'errands'
                );

                UserNotification::create([
                    'user_id' => $task->requester_id,
                    'type' => 'errand',
                    'title' => 'Runner has arrived!',
                    'body' => "Read out your PIN ({$task->pin_code}) to {$runnerName} to release payment.",
                    'data' => ['task_id' => $task->id],
                ]);
            }
        } catch (\Throwable $e) {
        }

        // Broadcast real-time Ably events for runner arrival
        try {
            $ably = app(AblyService::class);
            if ($ably->isConfigured()) {
                $taskData = $this->show($id, $request)->getData(true);
                $ably->publish("task:{$task->id}", 'task.updated', $taskData);
                $ably->publish("user:{$task->requester_id}", 'task.updated', $taskData);
            }
        } catch (\Throwable $e) {
        }

        return $this->show($id, $request);
    }

    /**
     * POST /tasks/{id}/verify-pin and /tasks/{id}/verify_pin
     * Releases escrow upon correct 4-digit Handshake PIN.
     */
    public function verifyPin(Request $request, string $id): JsonResponse
    {
        $task = Task::with(['runner.wallet', 'requester.wallet'])->find($id);
        if (! $task) {
            return response()->json(['code' => 'NOT_FOUND', 'message' => 'Task not found.'], 404);
        }

        $pin = trim((string) $request->input('pin'));
        $expectedPin = trim((string) $task->pin_code);

        if ($pin !== $expectedPin) {
            return response()->json([
                'code' => 'INVALID_PIN',
                'message' => 'The Handshake PIN entered is incorrect.',
            ], 422);
        }

        $bounty = $task->bounty_kobo;
        $fee = $task->platform_fee_kobo ?: (int) round($bounty * 0.10);
        $payoutKobo = max(0, $bounty - $fee);
        $cashRefundKobo = isset($task->cash_purchase['amount_kobo']) ? (int) $task->cash_purchase['amount_kobo'] : 0;
        $totalRunnerCredit = $payoutKobo + $cashRefundKobo;

        // Idempotency: If task is already completed, return without double-debiting escrow
        if ($task->status === 'completed') {
            $response = $this->show($id, $request);
            $data = $response->getData(true);
            $data['success'] = true;
            $data['payout_kobo'] = $payoutKobo;
            $data['cash_refund_kobo'] = $cashRefundKobo;

            return response()->json($data);
        }

        DB::transaction(function () use ($task, $totalRunnerCredit, $payoutKobo, $fee, $cashRefundKobo) {
            $task->status = 'completed';
            $task->completed_at = now();
            $task->save();

            // Escrow release from requester wallet
            if ($task->requester?->wallet) {
                $reqWallet = Wallet::where('id', $task->requester->wallet->id)->lockForUpdate()->first();
                $escrowRelease = $task->bounty_kobo + ($task->cash_purchase ? $cashRefundKobo : 0);
                $reqWallet->escrow_kobo = max(0, $reqWallet->escrow_kobo - $escrowRelease);
                $reqWallet->save();

                Transaction::create([
                    'wallet_id' => $reqWallet->id,
                    'task_id' => $task->id,
                    'type' => 'escrow_release',
                    'amount_kobo' => $escrowRelease,
                    'balance_before_kobo' => $reqWallet->balance_kobo,
                    'balance_after_kobo' => $reqWallet->balance_kobo,
                    'reference' => 'WD_ESC_REL_'.strtoupper(Str::random(10)),
                    'status' => 'success',
                    'metadata' => [
                        'task_id' => $task->id,
                        'reason' => 'Escrow released on verified PIN handshake',
                    ],
                ]);
            }

            // Credit runner wallet
            if ($task->runner_id) {
                $runnerWallet = Wallet::firstOrCreate(
                    ['user_id' => $task->runner_id],
                    [
                        'balance_kobo' => 0,
                        'escrow_kobo' => 0,
                        'virtual_account_nuban' => '9948'.rand(100000, 999999),
                        'virtual_bank_name' => 'Wema Bank',
                    ]
                );

                $lockedRunnerWallet = Wallet::where('id', $runnerWallet->id)->lockForUpdate()->first();
                $balanceBefore = $lockedRunnerWallet->balance_kobo;
                $lockedRunnerWallet->balance_kobo += $totalRunnerCredit;
                $lockedRunnerWallet->save();

                Transaction::create([
                    'wallet_id' => $lockedRunnerWallet->id,
                    'task_id' => $task->id,
                    'type' => 'payout',
                    'amount_kobo' => $totalRunnerCredit,
                    'balance_before_kobo' => $balanceBefore,
                    'balance_after_kobo' => $lockedRunnerWallet->balance_kobo,
                    'reference' => 'WD_PAYOUT_'.strtoupper(Str::random(10)),
                    'status' => 'success',
                    'metadata' => [
                        'task_id' => $task->id,
                        'bounty_kobo' => $task->bounty_kobo,
                        'payout_kobo' => $payoutKobo,
                        'fee_kobo' => $fee,
                        'cash_refund_kobo' => $cashRefundKobo,
                    ],
                ]);

                // Increment runner trips count
                User::where('id', $task->runner_id)->increment('trips_count');
            }

            // Book the platform commission as its own ledger entry
            app(PlatformRevenueService::class)->recordFee($task, $fee, $payoutKobo, $cashRefundKobo);

            TaskActivity::create([
                'task_id' => $task->id,
                'actor_id' => $task->runner_id ?? $task->requester_id,
                'event' => 'completed',
                'metadata' => [
                    'payout_kobo' => $totalRunnerCredit,
                    'pin_verified' => true,
                ],
            ]);
        });

        // Keep the runner's in-app notification in sync with the wallet credit.
        if ($task->runner && $totalRunnerCredit > 0) {
            $creditNaira = '₦'.number_format($totalRunnerCredit / 100);
            $payoutNaira = '₦'.number_format($payoutKobo / 100);
            $notification = app(NotificationService::class)->send(
                $task->runner,
                'money',
                "+{$creditNaira} landed in your wallet",
                $cashRefundKobo > 0
                    ? "You earned {$payoutNaira} and your cash purchase refund was included for {$task->item}."
                    : "You completed {$task->item}. Your runner fee is now in your wallet.",
                [
                    'type' => 'payout_credited',
                    'task_id' => (string) $task->id,
                    'amount_kobo' => $totalRunnerCredit,
                    'payout_kobo' => $payoutKobo,
                    'cash_refund_kobo' => $cashRefundKobo,
                ]
            );
            $this->publishNotification($notification);
        }

        // Notify requester to rate runner
        try {
            if ($task->requester) {
                app(ExpoNotificationService::class)->sendToUser(
                    $task->requester,
                    '🎉 Delivery Completed!',
                    "{$task->item} was delivered safely! Tap to rate your runner.",
                    ['type' => 'task_completed', 'task_id' => $task->id],
                    'errands'
                );
            }
        } catch (\Throwable $e) {
        }

        $response = $this->show($id, $request);
        $data = $response->getData(true);
        $data['success'] = true;
        $data['payout_kobo'] = $payoutKobo;
        $data['cash_refund_kobo'] = $cashRefundKobo;

        // Broadcast completion via Ably
        try {
            $ably = app(AblyService::class);
            if ($ably->isConfigured()) {
                $ably->publish("task:{$task->id}", 'task.completed', $data);
                $ably->publish("task:{$task->id}", 'task.updated', $data);
                $ably->publish("user:{$task->requester_id}", 'task.completed', $data);
            }
        } catch (\Throwable $e) {
        }

        return response()->json($data);
    }

    /**
     * GET /tasks/{id}/messages
     * Fetches chat messages for the task.
     */
    public function getMessages(Request $request, string $id): JsonResponse
    {
        $task = Task::findOrFail($id);
        $currentUser = $this->authenticatedUser($request);

        if (! $currentUser) {
            return response()->json(['code' => 'UNAUTHENTICATED', 'message' => 'Sign in to view task messages.'], 401);
        }

        if (! $this->isTaskParticipant($currentUser, $task)) {
            return response()->json(['code' => 'FORBIDDEN', 'message' => 'Only the sender and runner can view these messages.'], 403);
        }

        $messages = TaskMessage::where('task_id', $task->id)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'task_id' => $task->id,
            'count' => $messages->count(),
            'messages' => $messages->map(fn ($m) => [
                'id' => $m->id,
                'sender_id' => $m->sender_id,
                'sender_name' => $m->sender_name,
                'text' => $m->text,
                'is_runner' => (bool) $m->is_runner,
                'created_at' => (int) ($m->created_at->timestamp * 1000),
            ]),
        ]);
    }

    /**
     * POST /tasks/{id}/messages
     * Sends a chat message with anti-PIN leakage protection.
     */
    public function sendMessage(Request $request, string $id): JsonResponse
    {
        $task = Task::with(['requester', 'runner'])->findOrFail($id);
        $text = trim((string) $request->input('text', ''));

        if ($text === '') {
            return response()->json(['code' => 'EMPTY_MESSAGE', 'message' => 'Message text cannot be empty.'], 422);
        }

        // ANTI-PIN LEAKAGE GUARD:
        // Strictly blocks sending the 4-digit Handshake PIN in chat!
        $cleanText = preg_replace('/[\s\-_.,*#:\/]/', '', $text);
        $actualPin = (string) $task->pin_code;
        if ($actualPin !== '' && str_contains($cleanText, $actualPin)) {
            return response()->json([
                'code' => 'PIN_LEAK_BLOCKED',
                'message' => "Don't send your PIN in chat. Read it out in person.",
            ], 422);
        }

        $currentUser = $this->authenticatedUser($request);
        if (! $currentUser) {
            return response()->json(['code' => 'UNAUTHENTICATED', 'message' => 'Sign in to send task messages.'], 401);
        }

        if (! $this->isTaskParticipant($currentUser, $task)) {
            return response()->json(['code' => 'FORBIDDEN', 'message' => 'Only the sender and runner can send messages.'], 403);
        }

        $isRunner = $task->runner_id === $currentUser->id;
        $senderName = trim(($currentUser->first_name ?? '').' '.($currentUser->last_name ?? '')) ?: 'Waydrop User';

        $message = TaskMessage::create([
            'task_id' => $task->id,
            'sender_id' => $currentUser?->id,
            'sender_name' => $senderName,
            'text' => $text,
            'is_runner' => $isRunner,
        ]);

        $messagePayload = [
            'id' => $message->id,
            'task_id' => $message->task_id,
            'sender_id' => $message->sender_id,
            'sender_name' => $message->sender_name,
            'text' => $message->text,
            'is_runner' => (bool) $message->is_runner,
            'created_at' => (int) ($message->created_at->timestamp * 1000),
        ];

        // Real-time Ably broadcast for instant delivery to both parties
        try {
            $ably = app(AblyService::class);
            if ($ably->isConfigured()) {
                $ably->publish("task:{$task->id}", 'task.message', $messagePayload);
            }
        } catch (\Throwable $e) {
        }

        $recipient = $isRunner ? $task->requester : $task->runner;
        if ($recipient) {
            $notification = app(NotificationService::class)->send(
                $recipient,
                'message',
                "Message from {$senderName}",
                $text,
                ['type' => 'chat_message', 'task_id' => $task->id, 'message_id' => $message->id]
            );
            $this->publishNotification($notification);
        }

        return response()->json($messagePayload, 201);
    }

    /**
     * POST /tasks/{id}/call
     * Creates an authenticated Agora call session.
     */
    public function initiateCall(Request $request, string $id): JsonResponse
    {
        $task = Task::with(['requester', 'runner'])->findOrFail($id);
        $user = $this->authenticatedUser($request);

        if (! $user) {
            return response()->json(['code' => 'UNAUTHENTICATED', 'message' => 'Sign in to start a call.'], 401);
        }

        if (! $this->isTaskParticipant($user, $task)) {
            return response()->json(['code' => 'FORBIDDEN', 'message' => 'Only the sender and runner can call each other.'], 403);
        }

        if (! $task->runner_id || ! $task->runner || ! $task->requester) {
            return response()->json(['code' => 'CALL_UNAVAILABLE', 'message' => 'Calls become available after a runner accepts the errand.'], 409);
        }

        $callerId = $user->id;
        $receiverId = ($callerId === $task->requester_id) ? $task->runner_id : $task->requester_id;
        $receiver = ($callerId === $task->requester_id) ? $task->runner : $task->requester;
        $caller = ($callerId === $task->requester_id) ? $task->requester : $task->runner;

        $agoraChannel = 'wd-call-'.strtolower(str_replace('-', '', $task->id));

        $callSession = CallSession::create([
            'task_id' => $task->id,
            'caller_id' => $callerId,
            'receiver_id' => $receiverId,
            'agora_channel' => $agoraChannel,
            'status' => 'connecting',
            'started_at' => now(),
        ]);

        ExpireCallSession::dispatch($callSession->id)->delay(now()->addSeconds(90));

        $callerName = trim(($caller?->first_name ?? '').' '.($caller?->last_name ?? '')) ?: 'Waydrop User';

        $callPayload = [
            'call_session_id' => $callSession->id,
            'task_id' => $task->id,
            'caller_id' => $callerId,
            'caller_name' => $callerName,
            'receiver_id' => $receiverId,
            'receiver_name' => $receiver?->first_name ?? 'Waydrop User',
            'channel' => $agoraChannel,
            'is_runner' => $callerId === $task->runner_id,
            'receiver_is_runner' => $receiverId === $task->runner_id,
            'task_type' => $task->type,
        ];

        // Real-time Ably broadcast for call session
        try {
            $ably = app(AblyService::class);
            if ($ably->isConfigured()) {
                $ably->publish("task:{$task->id}", 'call.initiated', $callPayload);
                $ably->publish("user:{$receiverId}", 'call.initiated', $callPayload);
            }
        } catch (\Throwable $e) {
        }

        $notification = app(NotificationService::class)->send(
            $receiver,
            'call',
            "Incoming call from {$callerName}",
            "{$callerName} is calling about {$task->item}.",
            [
                'type' => 'call_initiated',
                'task_id' => $task->id,
                'call_session_id' => $callSession->id,
                'caller_id' => $callerId,
                'caller_name' => $callerName,
                'receiver_id' => $receiverId,
                'channel' => $agoraChannel,
                'receiver_is_runner' => $receiverId === $task->runner_id,
                'task_type' => $task->type,
            ]
        );
        $this->publishNotification($notification);

        return response()->json([
            'call_session_id' => $callSession->id,
            'task_id' => $task->id,
            'channel' => $agoraChannel,
            'mode' => 'agora',
            'contact_name' => trim(($receiver?->first_name ?? '').' '.($receiver?->last_name ?? '')) ?: 'Waydrop User',
            'guarantee' => 'Encrypted in-app Waydrop call.',
            'status' => 'connecting',
        ]);
    }

    /**
     * GET /calls/pending
     * Returns the latest still-ringing call where the authenticated user is the receiver.
     * Used when the app opens from a push notification, or resumes from the background.
     */
    public function pendingCall(Request $request): JsonResponse
    {
        $user = $this->authenticatedUser($request);

        if (! $user) {
            return response()->json(['code' => 'UNAUTHENTICATED', 'message' => 'Sign in to receive calls.'], 401);
        }

        $session = CallSession::with(['task', 'caller'])
            ->where('receiver_id', $user->id)
            ->whereIn('status', ['connecting', 'connected'])
            ->where('started_at', '>=', now()->subMinutes(2))
            ->latest('started_at')
            ->first();

        if (! $session || ! $session->task) {
            return response()->json(['call' => null]);
        }

        if (in_array($session->task->status, ['completed', 'cancelled'], true)) {
            return response()->json(['call' => null]);
        }

        $callerName = trim(($session->caller?->first_name ?? '').' '.($session->caller?->last_name ?? '')) ?: 'Waydrop User';

        return response()->json([
            'call' => [
                'call_session_id' => $session->id,
                'task_id' => $session->task_id,
                'caller_id' => $session->caller_id,
                'caller_name' => $callerName,
                'receiver_id' => $session->receiver_id,
                'receiver_name' => $user->first_name ?? 'Waydrop User',
                'channel' => $session->agora_channel,
                'contact_name' => $callerName,
                'receiver_is_runner' => $user->id === $session->task->runner_id,
                'task_type' => $session->task->type,
                'mode' => 'agora',
                'guarantee' => 'Encrypted in-app Waydrop call.',
                'status' => $session->status,
            ],
        ]);
    }

    /**
     * GET /tasks/{id}/call/token
     * Issues a short-lived RTC token for the authenticated task participant.
     */
    public function callToken(Request $request, string $id): JsonResponse
    {
        $task = Task::with(['requester', 'runner'])->findOrFail($id);
        $user = $this->authenticatedUser($request);

        if (! $user) {
            return response()->json(['code' => 'UNAUTHENTICATED', 'message' => 'Sign in to join the call.'], 401);
        }

        if (! $this->isTaskParticipant($user, $task)) {
            return response()->json(['code' => 'FORBIDDEN', 'message' => 'Only the sender and runner can join this call.'], 403);
        }

        $sessionQuery = CallSession::where('task_id', $task->id)
            ->where(function ($query) use ($user) {
                $query->where('caller_id', $user->id)->orWhere('receiver_id', $user->id);
            });

        $sessionId = $request->string('call_session_id')->toString();
        if ($sessionId !== '') {
            $sessionQuery->whereKey($sessionId);
        }

        $callSession = $sessionQuery->latest()->first();
        if (! $callSession || in_array($callSession->status, ['ended', 'missed'], true)) {
            return response()->json(['code' => 'CALL_UNAVAILABLE', 'message' => 'This call session is no longer available.'], 409);
        }

        try {
            $agora = app(AgoraService::class);
            $uid = $agora->uidForUser((string) $user->id);
            $expiresIn = 3600;
            $token = $agora->generateRtcToken($callSession->agora_channel, $uid, $expiresIn);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json(['code' => 'AGORA_NOT_CONFIGURED', 'message' => 'In-app calling is not configured on the server yet.'], 503);
        }

        if ($callSession->status === 'connecting' && $callSession->receiver_id === $user->id) {
            $callSession->forceFill(['status' => 'connected'])->save();
        }

        return response()->json([
            'call_session_id' => $callSession->id,
            'task_id' => $task->id,
            'app_id' => $agora->appId(),
            'channel' => $callSession->agora_channel,
            'token' => $token,
            'uid' => $uid,
            'expires_in' => $expiresIn,
        ]);
    }

    /**
     * POST /tasks/{id}/call/{callSession}/end
     * Ends the call session for both participants.
     */
    public function endCall(Request $request, string $id, string $callSession): JsonResponse
    {
        $task = Task::findOrFail($id);
        $user = $this->authenticatedUser($request);

        if (! $user) {
            return response()->json(['code' => 'UNAUTHENTICATED', 'message' => 'Sign in to end the call.'], 401);
        }

        if (! $this->isTaskParticipant($user, $task)) {
            return response()->json(['code' => 'FORBIDDEN', 'message' => 'Only the sender and runner can end this call.'], 403);
        }

        $session = CallSession::where('id', $callSession)
            ->where('task_id', $task->id)
            ->where(function ($query) use ($user) {
                $query->where('caller_id', $user->id)->orWhere('receiver_id', $user->id);
            })
            ->firstOrFail();

        if ($session->status !== 'ended') {
            $session->forceFill([
                'status' => 'ended',
                'ended_at' => now(),
            ])->save();
        }

        try {
            $ably = app(AblyService::class);
            if ($ably->isConfigured()) {
                $callEndedPayload = [
                    'call_session_id' => $session->id,
                    'task_id' => $task->id,
                ];
                $ably->publish("task:{$task->id}", 'call.ended', $callEndedPayload);

                foreach (array_unique(array_filter([$task->requester_id, $task->runner_id])) as $participantId) {
                    $ably->publish("user:{$participantId}", 'call.ended', $callEndedPayload);
                }
            }
        } catch (\Throwable $exception) {
            report($exception);
        }

        return response()->json([
            'call_session_id' => $session->id,
            'status' => 'ended',
        ]);
    }

    /**
     * POST /tasks/{id}/rating
     * Requester rates delivery, leaves tags/note, and optional tip.
     */
    public function rate(Request $request, string $id): JsonResponse
    {
        $task = Task::with(['requester.wallet', 'runner.wallet'])->findOrFail($id);

        $rating = (int) $request->input('rating', 5);
        $tags = (array) $request->input('tags', []);
        $note = (string) $request->input('note', '');
        $tipKobo = (int) ($request->input('tip_kobo', 0));

        if ($tipKobo > 0 && $task->requester && $task->runner) {
            $wallet = $task->requester->wallet;
            if ($wallet && $wallet->balance_kobo >= $tipKobo) {
                DB::transaction(function () use ($task, $tipKobo, $wallet) {
                    $lockedRequesterWallet = Wallet::where('id', $wallet->id)->lockForUpdate()->first();
                    $balanceBefore = $lockedRequesterWallet->balance_kobo;
                    $lockedRequesterWallet->balance_kobo -= $tipKobo;
                    $lockedRequesterWallet->save();

                    Transaction::create([
                        'wallet_id' => $lockedRequesterWallet->id,
                        'task_id' => $task->id,
                        'type' => 'tip_sent',
                        'amount_kobo' => $tipKobo,
                        'balance_before_kobo' => $balanceBefore,
                        'balance_after_kobo' => $lockedRequesterWallet->balance_kobo,
                        'reference' => 'WD_TIP_OUT_'.strtoupper(Str::random(10)),
                        'status' => 'success',
                        'metadata' => [
                            'task_id' => $task->id,
                            'reason' => 'Tip sent to runner '.($task->runner?->first_name ?? 'Runner'),
                        ],
                    ]);

                    $runnerWallet = Wallet::firstOrCreate(['user_id' => $task->runner_id]);
                    $lockedRunnerWallet = Wallet::where('id', $runnerWallet->id)->lockForUpdate()->first();
                    $runnerBefore = $lockedRunnerWallet->balance_kobo;
                    $lockedRunnerWallet->balance_kobo += $tipKobo;
                    $lockedRunnerWallet->save();

                    Transaction::create([
                        'wallet_id' => $lockedRunnerWallet->id,
                        'task_id' => $task->id,
                        'type' => 'tip_received',
                        'amount_kobo' => $tipKobo,
                        'balance_before_kobo' => $runnerBefore,
                        'balance_after_kobo' => $lockedRunnerWallet->balance_kobo,
                        'reference' => 'WD_TIP_IN_'.strtoupper(Str::random(10)),
                        'status' => 'success',
                        'metadata' => [
                            'task_id' => $task->id,
                            'reason' => 'Tip received from '.($task->requester?->first_name ?? 'Requester'),
                        ],
                    ]);
                });
            }
        }

        $task->rating = $rating;
        $task->rating_tags = $tags;
        $task->rating_note = $note;
        $task->tip_kobo = $tipKobo;
        $task->save();

        if ($task->runner_id) {
            $avg = Task::where('runner_id', $task->runner_id)->whereNotNull('rating')->avg('rating');
            if ($avg) {
                User::where('id', $task->runner_id)->update(['rating' => round($avg, 2)]);
            }
        }

        TaskActivity::create([
            'task_id' => $task->id,
            'actor_id' => $task->requester_id,
            'event' => 'rated',
            'metadata' => [
                'rating' => $rating,
                'tags' => $tags,
                'tip_kobo' => $tipKobo,
            ],
        ]);

        return response()->json([
            'id' => $task->id,
            'rating' => $task->rating,
            'rating_tags' => $task->rating_tags,
            'rating_note' => $task->rating_note,
            'tip_kobo' => $task->tip_kobo,
            'message' => 'Thank you for rating!',
        ]);
    }

    /**
     * GET /tasks/{id}/receipt
     * Returns digital errand receipt.
     */
    public function receipt(Request $request, string $id): JsonResponse
    {
        $task = Task::with(['requester', 'runner'])->findOrFail($id);

        $bounty = $task->bounty_kobo;
        $fee = $task->platform_fee_kobo ?: (int) round($bounty * 0.10);
        $tip = $task->tip_kobo ?: 0;
        $total = $bounty + $tip;

        $createdTime = $task->created_at?->timestamp ?? now()->timestamp;
        $completedTime = $task->completed_at?->timestamp ?? now()->timestamp;
        $durationMin = max(6, (int) round(($completedTime - $createdTime) / 60));

        return response()->json([
            'task_id' => $task->id,
            'reference' => 'WD-REC-'.strtoupper(str_replace('-', '', $task->id)),
            'date' => ($task->completed_at ?? $task->updated_at ?? now())->toIso8601String(),
            'requester' => [
                'name' => $task->requester?->name ?? 'Requester',
            ],
            'runner' => [
                'name' => $task->runner?->name ?? 'Tobi Adeyemi',
                'rating' => (float) ($task->runner?->rating ?? 4.90),
                'trips' => (int) ($task->runner?->trips_count ?? 212),
            ],
            'item' => $task->item,
            'note' => $task->note,
            'pickup' => $task->pickup_name,
            'dropoff' => $task->dropoff_name,
            'duration_minutes' => $durationMin,
            'bounty_kobo' => $bounty,
            'platform_fee_kobo' => $fee,
            'runner_payout_kobo' => max(0, $bounty - $fee),
            'tip_kobo' => $tip,
            'total_paid_kobo' => $total,
            'payment_method' => 'Waydrop Wallet (Escrow Verified)',
            'status' => 'Paid & Completed',
        ]);
    }

    /**
     * POST /tasks/{id}/disputes
     * Files a dispute ticket and holds escrow.
     */
    public function dispute(Request $request, string $id): JsonResponse
    {
        $task = Task::with(['requester.wallet', 'runner'])->findOrFail($id);

        $reason = $request->input('reason', 'wrong_item');
        $explanation = (string) $request->input('explanation', '');
        $evidenceUrls = (array) $request->input('evidence_urls', []);
        $user = $this->resolveUser($request);

        $isSafety = ($reason === 'safety');

        if ($task->status !== 'completed') {
            $task->status = 'disputed';
            $task->save();
        }

        $dispute = Dispute::create([
            'task_id' => $task->id,
            'requester_id' => $task->requester_id,
            'runner_id' => $task->runner_id,
            'opened_by' => $user?->id ?? $task->requester_id,
            'reason' => $reason,
            'explanation' => $explanation,
            'evidence_urls' => $evidenceUrls,
            'held_amount_kobo' => $task->bounty_kobo,
            'status' => 'open',
            'sla_expires_at' => $isSafety ? now()->addHours(1) : now()->addHours(24),
        ]);

        TaskActivity::create([
            'task_id' => $task->id,
            'actor_id' => $user?->id ?? $task->requester_id,
            'event' => 'dispute_opened',
            'metadata' => [
                'dispute_id' => $dispute->id,
                'reason' => $reason,
                'safety_alert' => $isSafety,
            ],
        ]);

        if ($isSafety) {
            try {
                app(ExpoNotificationService::class)->sendPushNotification(
                    Device::pluck('push_token')->all(),
                    "🚨 Campus Safety Alert - Errand {$task->id}",
                    "Safety escalation triggered for errand {$task->id}. Response team alerted.",
                    ['type' => 'safety_alert', 'task_id' => $task->id, 'dispute_id' => $dispute->id],
                    'safety'
                );
            } catch (\Throwable $e) {
            }
        }

        return response()->json([
            'ticket_id' => 'WD-TICKET-'.strtoupper(substr($dispute->id, 0, 8)),
            'dispute_id' => $dispute->id,
            'task_id' => $task->id,
            'reason' => $dispute->reason,
            'status' => 'under_review',
            'sla' => $isSafety ? '1 hour priority safety response' : 'Under 2 hours guarantee',
            'message' => 'Dispute registered. Campus support has paused escrow release.',
            'safety_alert' => $isSafety,
        ], 201);
    }

    /**
     * POST /tasks/{id}/runner-cancel
     * Runner emergency cancellation, resets errand to radar searching.
     */
    public function runnerCancel(Request $request, string $id): JsonResponse
    {
        $task = Task::with('requester')->findOrFail($id);

        $task->runner_id = null;
        $task->accepted_at = null;
        $task->picked_up_at = null;
        $task->arrived_at = null;
        $task->status = 'pending';
        $task->save();

        TaskActivity::create([
            'task_id' => $task->id,
            'actor_id' => $request->user('sanctum')?->id,
            'event' => 'runner_cancelled',
            'metadata' => [
                'reason' => $request->input('reason', 'Runner emergency / re-searching'),
            ],
        ]);

        try {
            if ($task->requester) {
                app(ExpoNotificationService::class)->sendToUser(
                    $task->requester,
                    '🔍 Finding you another runner',
                    "Your previous runner had to cancel. We've re-opened the radar to find another runner heading your way.",
                    ['type' => 'runner_cancelled_rematch', 'task_id' => $task->id],
                    'errands'
                );
            }
        } catch (\Throwable $e) {
        }

        return $this->show($id, $request);
    }
}
