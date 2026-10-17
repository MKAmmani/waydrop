<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Place;
use App\Models\Task;
use App\Models\User;
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
        if (!empty($siteId)) {
            $area = Area::find($siteId);
        }

        if (!$area && $user && $user->area_id) {
            $area = Area::find($user->area_id);
        }

        if (!$area) {
            $area = Area::where('is_active', true)->first();
        }

        $lat = $area ? (float) $area->lat : 11.980560;
        $lng = $area ? (float) $area->lng : 8.479440;

        // User wallet & escrow balance
        $wallet = $user ? $user->wallet : null;
        if ($user && !$wallet) {
            $wallet = $user->wallet()->create([
                'balance_kobo' => 485000,
                'escrow_kobo' => 50000,
                'virtual_bank_name' => 'Wema Bank',
                'virtual_account_nuban' => '9948123011',
            ]);
        }

        $balanceKobo = $wallet ? (int) $wallet->balance_kobo : 485000;
        $escrowKobo = $wallet ? (int) $wallet->escrow_kobo : 50000;
        $bankName = $wallet ? ($wallet->virtual_bank_name ?? 'Wema Bank') : 'Wema Bank';
        $accountNuban = $wallet ? ($wallet->virtual_account_nuban ?? '9948123011') : '9948123011';

        // Campus errand hubs and buildings
        $places = Place::where('area_id', $area?->id)->get();

        // Verified active runners in this campus
        $realRunners = User::where('area_id', $area?->id)
            ->where('runner_status', 'verified')
            ->where('is_blocked', false)
            ->get();

        $runnersNearby = max(8, $realRunners->count() + 12);

        $now = microtime(true);
        $runnersCoords = [];
        $initialsPool = ['MA', 'AU', 'IB', 'SA', 'KM', 'YD', 'HA', 'BL', 'US', 'FK', 'AB', 'ZM'];
        if ($places->count() >= 2) {
            $pList = $places->values()->all();
            $numPlaces = count($pList);
            for ($i = 0; $i < min(14, $runnersNearby); $i++) {
                $pA = $pList[$i % $numPlaces];
                $pB = $pList[($i + 1) % $numPlaces];

                // Continuous walking cycle: ping-pong back and forth smoothly between places
                $cycle = fmod(($now * 0.02) + ($i * 0.16), 2.0);
                $t = $cycle > 1.0 ? (2.0 - $cycle) : $cycle;
                $jitterLat = sin($i * 2.7 + $now * 0.12) * 0.00006;
                $jitterLng = cos($i * 3.1 + $now * 0.12) * 0.00006;

                $curLat = (float) $pA->lat + ((float) $pB->lat - (float) $pA->lat) * $t + $jitterLat;
                $curLng = (float) $pA->lng + ((float) $pB->lng - (float) $pA->lng) * $t + $jitterLng;

                $headingDeg = round(rad2deg(atan2((float)$pB->lng - (float)$pA->lng, (float)$pB->lat - (float)$pA->lat)));
                if ($cycle > 1.0) $headingDeg = ($headingDeg + 180) % 360;

                $runnersCoords[] = [
                    'id' => 'runner_' . $i,
                    'lat' => round($curLat, 6),
                    'lng' => round($curLng, 6),
                    'initials' => $initialsPool[$i % count($initialsPool)],
                    'heading' => ($headingDeg + 360) % 360,
                ];
            }
        } else {
            $spread = 0.00045;
            for ($i = 0; $i < min(14, $runnersNearby); $i++) {
                $angle = ($now * 0.15) + ($i * 0.5);
                $offsetLat = sin($angle) * $spread;
                $offsetLng = cos($angle) * $spread;
                $runnersCoords[] = [
                    'id' => 'runner_' . $i,
                    'lat' => round($lat + $offsetLat, 6),
                    'lng' => round($lng + $offsetLng, 6),
                    'initials' => $initialsPool[$i % count($initialsPool)],
                    'heading' => (round(rad2deg($angle)) + 360) % 360,
                ];
            }
        }

        $busySpots = $places->take(16)->map(function ($p, $idx) use ($lat, $lng) {
            return [
                'lat' => (float) ($p->lat ?? $lat),
                'lng' => (float) ($p->lng ?? $lng),
                'count' => 3 + ($idx % 3),
                'label' => $p->name,
                'kind' => $p->kind ?? 'landmark',
            ];
        })->values()->toArray();

        // Active errand routes (Google Maps style: runner heading to destination place)
        $routes = [];
        if (!empty($runnersCoords) && !empty($busySpots)) {
            // Take 2 runners heading to actual campus places
            for ($rIdx = 0; $rIdx < min(2, count($runnersCoords)); $rIdx++) {
                $runner = $runnersCoords[$rIdx];
                $destPlace = $busySpots[($rIdx * 3 + 2) % count($busySpots)];
                $routes[] = [
                    'from' => 'Runner ' . ($runner['initials'] ?? 'WD'),
                    'to' => $destPlace['label'],
                    'path' => [
                        ['lat' => $runner['lat'], 'lng' => $runner['lng']],
                        ['lat' => $destPlace['lat'], 'lng' => $destPlace['lng']],
                    ],
                    'kind' => 'active_delivery',
                ];
            }
        }

        // Saved campus places from database places
        $savedPlaces = $places->take(4)->map(function ($p) {
            $label = match ($p->kind) {
                'library' => 'Study',
                'cafeteria', 'market' => 'Food',
                'hostel' => 'Hostel',
                default => 'Spot',
            };
            return [
                'id' => (string) $p->id,
                'label' => $label,
                'name' => $p->name,
            ];
        })->values()->toArray();

        // Send again tasks (from user's real task history or campus errand suggestions)
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

        if (empty($sendAgain)) {
            if ($places->count() >= 2) {
                $p1 = $places[0];
                $p2 = $places[1];
                $sendAgain = [
                    ['id' => 's1', 'item' => 'Documents', 'from' => $p1->name, 'to' => $p2->name, 'price' => 50000],
                    ['id' => 's2', 'item' => 'Parcel', 'from' => $p2->name, 'to' => $p1->name, 'price' => 45000],
                ];
            } else {
                $sendAgain = [
                    ['id' => 's1', 'item' => 'Calculator', 'from' => 'Main Gate', 'to' => 'Library', 'price' => 50000],
                    ['id' => 's2', 'item' => 'Lunch Pack', 'from' => 'Food Spot', 'to' => 'Lecture Hall', 'price' => 45000],
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
        if ($places->contains(fn($p) => str_contains(strtolower($p->name), 'library'))) {
            $northRoad = 'Library Way';
        }

        $axisRoad = 'Road';
        if ($places->contains(fn($p) => str_contains(strtolower($p->name), 'senate'))) {
            $axisRoad = 'Senate Way';
        } elseif ($places->contains(fn($p) => str_contains(strtolower($p->name), 'faculty'))) {
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
                'referral_code' => $user ? ('WAY-' . strtoupper(substr($user->first_name ?? 'VIP', 0, 3)) . '-' . substr($user->id, 0, 4)) : 'WAY-VIP-4821',
            ],
            'unread' => 0,
            'runners_nearby' => $runnersNearby,
            'runners' => $runnersCoords,
            'busy_spots' => $busySpots,
            'routes' => $routes,
            'roads' => $roads,
            'send_again' => $sendAgain,
            'saved_places' => $savedPlaces,
            'earn' => $earnStats,
        ]);
    }
}
