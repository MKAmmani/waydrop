<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Area;
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
        $clientId = $user ? (string) $user->id : 'anon_'.substr(md5($request->ip() ?? 'guest'), 0, 10);

        $tokenRequest = $ably->createTokenRequest($clientId);

        if (! $tokenRequest) {
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
        $area = Area::find($campusId);
        if (! $area) {
            return response()->json([
                'error' => [
                    'code' => 'AREA_NOT_FOUND',
                    'message' => 'Campus area not found.',
                ],
            ], 404);
        }

        $runners = [];
        $count = 0;

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
