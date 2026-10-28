<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Place;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HomeController extends Controller
{
    /**
     * Get home screen radar data, wallet balance, and campus activity
     * GET /api/home?site={site_id}&mode={request|earn}
     */
    public function index(Request $request): JsonResponse
    {
        $siteId = $request->input('site') ?? $request->input('site_id');
        $mode = $request->input('mode', 'request');
        $user = $request->user('sanctum');

        // Resolve active campus: explicit ?site parameter -> user's registered area -> first active area
        $area = null;
        if (! empty($siteId)) {
            $area = Area::find($siteId);
        }

        if (! $area && $user && $user->area_id) {
            $area = Area::find($user->area_id);
        }

        if (! $area) {
            $area = Area::where('is_active', true)->first();
        }

        // User wallet & escrow balance
        $wallet = $user ? $user->wallet : null;
        if ($user && ! $wallet) {
            $wallet = $user->wallet()->create([
                'balance_kobo' => 0,
                'escrow_kobo' => 0,
                'virtual_bank_name' => 'Squad GTCO Escrow',
                'virtual_account_nuban' => '801'.random_int(1000000, 9999999),
            ]);
        }

        $balanceKobo = $wallet ? (int) $wallet->balance_kobo : 0;
        $escrowKobo = $wallet ? (int) $wallet->escrow_kobo : 0;
        $bankName = $wallet ? ($wallet->virtual_bank_name ?? 'Squad GTCO Escrow') : 'Squad GTCO Escrow';
        $accountNuban = $wallet ? ($wallet->virtual_account_nuban ?? '8010000000') : '8010000000';

        // Campus errand hubs and buildings
        $places = Place::where('area_id', $area?->id)->get();

        // Only show map activity that exists in the database. Runner locations are
        // not persisted yet, so the radar must remain empty instead of inventing dots.
        $runnersNearby = 0;
        $runnersCoords = [];
        $routes = [];
        $placeById = $places->keyBy(fn (Place $place) => (string) $place->id);
        $pendingTasks = Task::where('status', 'pending')
            ->where(function ($query) use ($area) {
                $query->where('area_id', $area?->id)->orWhereNull('area_id');
            })
            ->get();

        $busySpots = $pendingTasks
            ->groupBy(function (Task $task) {
                return $task->pickup_place_id
                    ? 'place:'.$task->pickup_place_id
                    : 'name:'.strtolower(trim((string) $task->pickup_name));
            })
            ->map(function ($tasks) use ($placeById) {
                /** @var Task $task */
                $task = $tasks->first();
                $place = $task->pickup_place_id
                    ? $placeById->get((string) $task->pickup_place_id)
                    : null;
                $lat = $task->pickup_lat ?? $place?->lat;
                $lng = $task->pickup_lng ?? $place?->lng;

                if ($lat === null || $lng === null) {
                    return null;
                }

                return [
                    'place_id' => $task->pickup_place_id ? (string) $task->pickup_place_id : null,
                    'lat' => (float) $lat,
                    'lng' => (float) $lng,
                    'count' => $tasks->count(),
                    'label' => $task->pickup_name ?: ($place?->name ?? 'Campus pickup'),
                    'kind' => $place?->kind ?? 'landmark',
                ];
            })
            ->filter()
            ->values()
            ->all();

        // Active errand for this user (if any)
        $activeTask = null;
        if ($user) {
            $active = Task::where(function ($q) use ($user) {
                $q->where('requester_id', $user->id)
                    ->orWhere('runner_id', $user->id);
            })
                ->whereIn('status', ['pending', 'accepted', 'in_transit', 'picked_up', 'arrived', 'shopping', 'bought'])
                ->with(['runner', 'requester'])
                ->latest()
                ->first();

            if ($active) {
                $isRequester = $active->requester_id === $user->id;
                $runnerName = $active->runner ? ($active->runner->first_name ?? 'Runner') : 'Finding runner';
                $statusText = match ($active->status) {
                    'pending' => 'Finding runner nearby',
                    'accepted' => "{$runnerName} accepted · On route to pickup",
                    'shopping' => "{$runnerName} is shopping",
                    'bought' => "{$runnerName} finished buying",
                    'picked_up' => "{$runnerName} picked up · On route to you",
                    'in_transit' => "{$runnerName} on route · Tap to track live",
                    'arrived' => "{$runnerName} has arrived · Meet for PIN handover",
                    default => "{$runnerName} on route · Tap to track live",
                };

                $activeTask = [
                    'id' => (string) $active->id,
                    'item' => $active->item,
                    'from' => $active->pickup_name,
                    'to' => $active->dropoff_name,
                    'status' => $active->status,
                    'status_text' => $statusText,
                    'type' => $active->type ?? 'move',
                    'is_buy' => $active->type === 'buy' || ($active->budget_kobo ?? 0) > 0,
                    'runner_first_name' => $active->runner?->first_name,
                    'is_requester' => $isRequester,
                ];
            }
        }

        // Saved places for the user (empty for new users until saved)
        $savedPlaces = [];

        // Send again tasks (from user's real task history only)
        $sendAgain = [];
        if ($user) {
            $prevTasks = Task::where('requester_id', $user->id)
                ->where('status', 'completed')
                ->latest()
                ->take(3)
                ->get();

            foreach ($prevTasks as $t) {
                $sendAgain[] = [
                    'id' => (string) $t->id,
                    'item' => $t->item,
                    'from' => $t->pickup_name,
                    'to' => $t->dropoff_name,
                    'price' => (int) $t->bounty_kobo,
                ];
            }
        }

        // Runner earn stats (kept intact)
        $earnStats = [
            'today' => 0,
            'week' => 0,
            'week_errands' => 0,
            'rating' => 5.0,
        ];

        if ($user && $user->runner_status === 'verified') {
            $earnStats['rating'] = (float) ($user->rating ?? 5.0);
            $earnStats['week_errands'] = (int) ($user->trips_count ?? 0);

            $now = now();
            $todayStart = $now->copy()->startOfDay();
            $weekStart = $now->copy()->startOfWeek();
            $completedRunnerTasks = $user->runnerTasks()
                ->where('status', 'completed')
                ->whereNotNull('completed_at')
                ->where('completed_at', '>=', $weekStart)
                ->get(['bounty_kobo', 'platform_fee_kobo', 'tip_kobo', 'completed_at']);

            $earningsForTask = static function (Task $task): int {
                $bountyKobo = (int) ($task->bounty_kobo ?? 0);
                $feeKobo = (int) ($task->platform_fee_kobo ?: round($bountyKobo * 0.10));

                return max(0, $bountyKobo - $feeKobo) + (int) ($task->tip_kobo ?? 0);
            };

            $earnStats['week'] = (int) $completedRunnerTasks->sum($earningsForTask);
            $earnStats['today'] = (int) $completedRunnerTasks
                ->filter(fn (Task $task) => $task->completed_at?->greaterThanOrEqualTo($todayStart))
                ->sum($earningsForTask);
        }

        // Resolve real campus road names (or default to "Road" if unknown)
        $campusSubtitle = strtolower($area?->subtitle ?? '');
        $campusName = strtolower($area?->name ?? '');

        $mainRoad = 'Road';
        if (str_contains($campusSubtitle, 'gwarzo') || str_contains($campusName, 'gwarzo') || $area?->id === 'buk-new') {
            $mainRoad = 'Gwarzo Rd';
        } elseif (str_contains($campusSubtitle, 'buk road') || str_contains($campusName, 'buk old') || $area?->id === 'buk-old') {
            $mainRoad = 'BUK Rd';
        } elseif (str_contains($campusSubtitle, 'akoka') || str_contains($campusSubtitle, 'yaba')) {
            $mainRoad = 'University Rd';
        }

        $northRoad = 'Road';
        if ($places->contains(fn ($p) => str_contains(strtolower($p->name), 'library'))) {
            $northRoad = 'Library Way';
        }

        $axisRoad = 'Road';
        if ($places->contains(fn ($p) => str_contains(strtolower($p->name), 'senate'))) {
            $axisRoad = 'Senate Way';
        } elseif ($places->contains(fn ($p) => str_contains(strtolower($p->name), 'faculty'))) {
            $axisRoad = 'Faculty Way';
        }

        $roads = [
            ['id' => 'center', 'name' => $mainRoad, 'position' => 'center'],
            ['id' => 'north', 'name' => $northRoad, 'position' => 'north'],
            ['id' => 'axis', 'name' => $axisRoad, 'position' => 'axis'],
        ];

        return response()->json([
            'site_id' => (string) ($area?->id ?? 'buk-new'),
            'area' => $area ? [
                'id' => (string) $area->id,
                'name' => $area->name,
                'subtitle' => $area->subtitle,
                'lat' => (float) $area->lat,
                'lng' => (float) $area->lng,
                'radius_meters' => (int) ($area->radius_meters ?? 160),
            ] : null,
            'balance' => $balanceKobo,
            'escrow' => $escrowKobo,
            'wallet' => [
                'balance_kobo' => $balanceKobo,
                'escrow_kobo' => $escrowKobo,
                'virtual_bank_name' => $bankName,
                'virtual_account_nuban' => $accountNuban,
            ],
            'profile' => [
                'rating' => ($user && (int) ($user->trips_count ?? 0) > 0) ? (float) $user->rating : null,
                'trips_count' => (int) ($user?->trips_count ?? 0),
                'runner_status' => $user ? ($user->runner_status ?? 'unverified') : 'unverified',
                'referral_code' => $user ? ('WAY-'.strtoupper(substr($user->first_name ?? 'VIP', 0, 3)).'-'.substr($user->id, 0, 4)) : 'WAY-VIP-4821',
            ],
            'unread' => $user ? $user->userNotifications()->unread()->count() : 0,
            'runners_nearby' => $runnersNearby,
            'runners' => $runnersCoords,
            'busy_spots' => $busySpots,
            'places' => $places
                ->filter(fn (Place $place) => $place->lat !== null && $place->lng !== null)
                ->map(fn (Place $place) => [
                    'id' => (string) $place->id,
                    'name' => $place->name,
                    'lat' => (float) $place->lat,
                    'lng' => (float) $place->lng,
                    'kind' => $place->kind,
                ])
                ->values(),
            'routes' => $routes,
            'roads' => $roads,
            'active_task' => $activeTask,
            'send_again' => $sendAgain,
            'saved_places' => $savedPlaces,
            'earn' => $earnStats,
        ]);
    }
}
