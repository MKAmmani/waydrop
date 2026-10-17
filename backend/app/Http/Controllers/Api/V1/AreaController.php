<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AreaController extends Controller
{
    /**
     * Compute Haversine distance in kilometres between two coordinates
     */
    protected function haversineDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371; // km
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLng / 2) * sin($dLng / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Detect nearest active campus or urban area to given GPS coordinates
     * GET /api/areas/nearby?lat={lat}&lng={lng}
     */
    public function nearby(Request $request): JsonResponse
    {
        $request->validate([
            'lat' => ['required', 'numeric'],
            'lng' => ['required', 'numeric'],
        ]);

        $userLat = (float) $request->lat;
        $userLng = (float) $request->lng;

        $areas = Area::where('is_active', true)->get();

        if ($areas->isEmpty()) {
            return response()->json([
                'area' => null,
                'runners_active' => 4,
                'nearby_areas' => [],
            ]);
        }

        // Calculate distance from user's coordinates to all active campuses
        $calculated = $areas->map(function ($area) use ($userLat, $userLng) {
            $distanceKm = $this->haversineDistance($userLat, $userLng, (float) $area->lat, (float) $area->lng);

            // Real verified runners in this campus area
            $verifiedRunners = User::where('area_id', $area->id)
                ->where('runner_status', 'verified')
                ->where('is_blocked', false)
                ->count();

            // Dynamic runner activity estimate scaled by proximity
            $activeCount = max(8, $verifiedRunners + (int) round(25 / max(1.0, $distanceKm)));

            return [
                'id' => (string) $area->id,
                'name' => $area->name,
                'subtitle' => $area->subtitle,
                'lat' => (float) $area->lat,
                'lng' => (float) $area->lng,
                'distance_km' => round($distanceKm, 2),
                'runners_active' => $activeCount,
            ];
        })->sortBy('distance_km')->values();

        $bestArea = $calculated->first();

        return response()->json([
            'area' => $bestArea ? [
                'id' => $bestArea['id'],
                'name' => $bestArea['name'],
                'subtitle' => $bestArea['subtitle'],
                'lat' => $bestArea['lat'],
                'lng' => $bestArea['lng'],
                'distance_km' => $bestArea['distance_km'],
            ] : null,
            'runners_active' => $bestArea ? $bestArea['runners_active'] : 4,
            'nearby_areas' => $calculated->all(),
        ]);
    }

    /**
     * Search campus areas by name or subtitle
     * GET /api/areas?q={query}
     */
    public function search(Request $request): JsonResponse
    {
        $query = trim($request->input('q', ''));

        $areasQuery = Area::where('is_active', true);

        if ($query !== '') {
            $areasQuery->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('subtitle', 'like', "%{$query}%");
            });
        }

        $areas = $areasQuery->orderBy('name')->get()->map(function ($a) {
            $verifiedRunners = User::where('area_id', $a->id)
                ->where('runner_status', 'verified')
                ->where('is_blocked', false)
                ->count();

            return [
                'id' => (string) $a->id,
                'name' => $a->name,
                'subtitle' => $a->subtitle,
                'lat' => (float) $a->lat,
                'lng' => (float) $a->lng,
                'runners_active' => max(6, $verifiedRunners + 10),
            ];
        });

        return response()->json($areas);
    }
}
