<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Device;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DeviceController extends Controller
{
    /**
     * Register or update push notification device token
     * POST /api/devices
     */
    public function register(Request $request): Response
    {
        $request->validate([
            'push_token' => ['required', 'string'],
            'platform' => ['nullable', 'string', 'in:ios,android,web'],
            'locale' => ['nullable', 'string', 'max:10'],
        ]);

        $user = $request->user();

        Device::updateOrCreate(
            [
                'user_id' => $user->id,
                'push_token' => $request->push_token,
            ],
            [
                'platform' => $request->input('platform', 'android'),
                'locale' => $request->input('locale', 'en-NG'),
                'last_active_at' => now(),
            ]
        );

        return response()->noContent();
    }
}
