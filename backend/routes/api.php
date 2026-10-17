<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\AreaController;
use App\Http\Controllers\Api\V1\DeviceController;
use App\Http\Controllers\Api\V1\HomeController;
use App\Http\Controllers\Api\V1\AblyController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Waydrop Mobile Client API Routes
|--------------------------------------------------------------------------
|
| These routes handle mobile onboarding, authentication, user profiles,
| campus geography, device push token registration, and home radar data.
|
*/

$registerRoutes = function () {
    // 1. Authentication & SMS OTP Funnel
    Route::prefix('auth')->group(function () {
        Route::post('/otp/request', [AuthController::class, 'requestOtp'])->name('api.auth.otp.request');
        Route::post('/otp/verify', [AuthController::class, 'verifyOtp'])->name('api.auth.otp.verify');
        Route::post('/oauth', [AuthController::class, 'oauth'])->name('api.auth.oauth');
    });

    // 2. Campus Geography & Nearby Areas (Public)
    Route::prefix('areas')->group(function () {
        Route::get('/nearby', [AreaController::class, 'nearby'])->name('api.areas.nearby');
        Route::get('/', [AreaController::class, 'search'])->name('api.areas.search');
    });

    // 3. Home Screen & Map Radar
    Route::get('/home', [HomeController::class, 'index'])->name('api.home');

    // 4. Ably Real-Time Authentication Token & Radar Broadcast
    Route::match(['get', 'post'], '/realtime/token', [AblyController::class, 'token'])->name('api.realtime.token');
    Route::post('/campus/{campus_id}/broadcast-radar', [AblyController::class, 'broadcastCampusRadar'])->name('api.realtime.broadcast-radar');

    // 5. Authenticated Mobile Routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [UserController::class, 'me'])->name('api.me.get');
        Route::patch('/me', [UserController::class, 'updateMe'])->name('api.me.update');
        Route::post('/me/photo', [UserController::class, 'uploadPhoto'])->name('api.me.photo');
        Route::post('/runners/verify', [UserController::class, 'verifyRunner'])->name('api.runners.verify');
        Route::post('/runners/unverify', [UserController::class, 'unverifyRunner'])->name('api.runners.unverify');
        Route::post('/devices', [DeviceController::class, 'register'])->name('api.devices.register');
    });
};

// Direct /api/* routes (matches mobile EXPO_PUBLIC_API_BASE_URL="http://.../api")
$registerRoutes();

// Versioned /api/v1/* alias (matches EXPO_PUBLIC_API_BASE_URL="http://.../api/v1")
Route::prefix('v1')->group($registerRoutes);
