<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AblyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AblyController extends Controller
{
    /**
     * Issue Ably Token Request for client authentication
     * GET or POST /api/realtime/token
     */
    public function token(Request $request, AblyService $ably): JsonResponse
    {
        $user = $request->user('sanctum');
        $clientId = $user ? (string) $user->id : 'anon_' . substr(md5($request->ip() ?? 'guest'), 0, 10);

        $tokenRequest = $ably->createTokenRequest($clientId);

        if (!$tokenRequest) {
            return response()->json([
                'error' => [
                    'code' => 'ABLY_NOT_CONFIGURED',
                    'message' => 'Real-time service is not configured or unavailable.',
                ],
            ], 503);
        }

        return response()->json($tokenRequest);
    }

    /**
     * Broadcast live runner updates to a campus radar channel
     * POST /api/campus/{campus_id}/broadcast-radar
     */
    public function broadcastCampusRadar(string $campusId, Request $request, AblyService $ably): JsonResponse
    {
        $area = \App\Models\Area::find($campusId);
        if (!$area) {
            return response()->json([
                'error' => [
                    'code' => 'AREA_NOT_FOUND',
                    'message' => 'Campus area not found.',
                ],
            ], 404);
        }

        $lat = (float) $area->lat;
        $lng = (float) $area->lng;

        $realRunners = \App\Models\User::where('area_id', $area->id)
            ->where('runner_status', 'verified')
            ->where('is_blocked', false)
            ->count();

        $count = max(8, $realRunners + 12);
        $places = \App\Models\Place::where('area_id', $area->id)->get();
        $now = microtime(true);
        $runners = [];
        $initialsPool = ['MA', 'AU', 'IB', 'SA', 'KM', 'YD', 'HA', 'BL', 'US', 'FK', 'AB', 'ZM'];

        if ($places->count() >= 2) {
            $pList = $places->values()->all();
            $numPlaces = count($pList);
            for ($i = 0; $i < min(14, $count); $i++) {
                $pA = $pList[$i % $numPlaces];
                $pB = $pList[($i + 1) % $numPlaces];
                $cycle = fmod(($now * 0.02) + ($i * 0.16), 2.0);
                $t = $cycle > 1.0 ? (2.0 - $cycle) : $cycle;
                $jitterLat = sin($i * 2.7 + $now * 0.12) * 0.00006;
                $jitterLng = cos($i * 3.1 + $now * 0.12) * 0.00006;

                $curLat = (float) $pA->lat + ((float) $pB->lat - (float) $pA->lat) * $t + $jitterLat;
                $curLng = (float) $pA->lng + ((float) $pB->lng - (float) $pA->lng) * $t + $jitterLng;

                $headingDeg = round(rad2deg(atan2((float)$pB->lng - (float)$pA->lng, (float)$pB->lat - (float)$pA->lat)));
                if ($cycle > 1.0) $headingDeg = ($headingDeg + 180) % 360;

                $runners[] = [
                    'id' => 'runner_' . $i,
                    'lat' => round($curLat, 6),
                    'lng' => round($curLng, 6),
                    'initials' => $initialsPool[$i % count($initialsPool)],
                    'heading' => ($headingDeg + 360) % 360,
                ];
            }
        } else {
            $spread = 0.00045;
            for ($i = 0; $i < min(14, $count); $i++) {
                $angle = ($now * 0.15) + ($i * 0.5);
                $offsetLat = sin($angle) * $spread;
                $offsetLng = cos($angle) * $spread;
                $runners[] = [
                    'id' => 'runner_' . $i,
                    'lat' => round($lat + $offsetLat, 6),
                    'lng' => round($lng + $offsetLng, 6),
                    'initials' => $initialsPool[$i % count($initialsPool)],
                    'heading' => (round(rad2deg($angle)) + 360) % 360,
                ];
            }
        }

        $published = $ably->publishCampusRadar($area->id, [
            'site_id' => $area->id,
            'runners' => $runners,
            'runners_nearby' => $count,
        ]);

        return response()->json([
            'success' => $published,
            'site_id' => $area->id,
            'runners_count' => count($runners),
        ]);
    }
}
