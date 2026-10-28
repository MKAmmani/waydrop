<?php

use App\Http\Controllers\Api\V1\AblyController;
use App\Http\Controllers\Api\V1\AreaController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DeviceController;
use App\Http\Controllers\Api\V1\HomeController;
use App\Http\Controllers\Api\V1\MediaController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\TaskController;
use App\Http\Controllers\Api\V1\UserController;
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

    // 5. Tasks, Quotes & Live Delivery (Batch 3, Batch 3B & Batch 4)
    Route::post('/quotes', [TaskController::class, 'quote'])->name('api.quotes');
    Route::post('/tasks', [TaskController::class, 'store'])->name('api.tasks.store');
    Route::get('/tasks/available', [TaskController::class, 'available'])->name('api.tasks.available');
    Route::get('/tasks/{id}', [TaskController::class, 'show'])->name('api.tasks.show');
    Route::post('/tasks/{id}/accept', [TaskController::class, 'accept'])->name('api.tasks.accept');
    Route::post('/tasks/{id}/progress', [TaskController::class, 'progress'])->name('api.tasks.progress');
    Route::post('/tasks/{id}/pickup', [TaskController::class, 'pickup'])->name('api.tasks.pickup');
    Route::post('/tasks/{id}/arrive', [TaskController::class, 'arrive'])->name('api.tasks.arrive');
    Route::post('/tasks/{id}/verify-pin', [TaskController::class, 'verifyPin'])->name('api.tasks.verify-pin');
    Route::post('/tasks/{id}/verify_pin', [TaskController::class, 'verifyPin'])->name('api.tasks.verify_pin');
    Route::get('/tasks/{id}/messages', [TaskController::class, 'getMessages'])->name('api.tasks.messages.get');
    Route::post('/tasks/{id}/messages', [TaskController::class, 'sendMessage'])->name('api.tasks.messages.send');
    Route::post('/tasks/{id}/call', [TaskController::class, 'initiateCall'])->name('api.tasks.call');
    Route::post('/tasks/{id}/rating', [TaskController::class, 'rate'])->name('api.tasks.rate');
    Route::get('/tasks/{id}/receipt', [TaskController::class, 'receipt'])->name('api.tasks.receipt');
    Route::post('/tasks/{id}/disputes', [TaskController::class, 'dispute'])->name('api.tasks.dispute');
    Route::post('/tasks/{id}/runner-cancel', [TaskController::class, 'runnerCancel'])->name('api.tasks.runner-cancel');
    Route::post('/tasks/{id}/bounty', [TaskController::class, 'raiseBounty'])->name('api.tasks.bounty');
    Route::post('/tasks/{id}/cancel', [TaskController::class, 'cancel'])->name('api.tasks.cancel');
    Route::post('/wallet/topups', [TaskController::class, 'topup'])->name('api.wallet.topup');

    // Batch 3B: Buy For Me routes
    Route::get('/banks', [TaskController::class, 'banks'])->name('api.banks.index');
    Route::get('/banks/resolve', [TaskController::class, 'resolveBank'])->name('api.banks.resolve');
    Route::post('/tasks/{id}/vendor_payments', [TaskController::class, 'payVendor'])->name('api.tasks.vendor_payments');
    Route::post('/tasks/{id}/cash_purchases', [TaskController::class, 'logCash'])->name('api.tasks.cash_purchases');
    Route::post('/tasks/{id}/beacon', [TaskController::class, 'toggleBeacon'])->name('api.tasks.beacon');
    Route::post('/tasks/{id}/beacon_request', [TaskController::class, 'askBeacon'])->name('api.tasks.beacon_request');
    Route::post('/tasks/{id}/asks', [TaskController::class, 'createAsk'])->name('api.tasks.asks.create');
    Route::post('/tasks/{id}/asks/{askId}', [TaskController::class, 'answerAsk'])->name('api.tasks.asks.answer');
    Route::patch('/tasks/{id}/items/{itemIndex}', [TaskController::class, 'updateItem'])->name('api.tasks.items.update');

    // 6. Authenticated Mobile Routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [UserController::class, 'me'])->name('api.me.get');
        Route::patch('/me', [UserController::class, 'updateMe'])->name('api.me.update');
        Route::post('/me/photo', [UserController::class, 'uploadPhoto'])->name('api.me.photo');
        Route::post('/uploads/errand-photo', [MediaController::class, 'uploadErrandPhoto'])->name('api.uploads.errand-photo');
        Route::post('/runners/verify', [UserController::class, 'verifyRunner'])->name('api.runners.verify');
        Route::post('/runners/unverify', [UserController::class, 'unverifyRunner'])->name('api.runners.unverify');
        Route::post('/devices', [DeviceController::class, 'register'])->name('api.devices.register');

        // Notifications
        Route::get('/notifications', [NotificationController::class, 'index'])->name('api.notifications.index');
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('api.notifications.read-all');
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('api.notifications.read');
        Route::get('/calls/pending', [TaskController::class, 'pendingCall'])->name('api.calls.pending');
        Route::post('/tasks/{id}/delivery-photo', [TaskController::class, 'uploadDeliveryPhoto'])->name('api.tasks.delivery-photo');
        Route::get('/tasks/{id}/call/token', [TaskController::class, 'callToken'])->name('api.tasks.call-token');
        Route::post('/tasks/{id}/call/{callSession}/end', [TaskController::class, 'endCall'])->name('api.tasks.call-end');
    });
};

// Direct /api/* routes (matches mobile EXPO_PUBLIC_API_BASE_URL="http://.../api")
$registerRoutes();

// Versioned /api/v1/* alias (matches EXPO_PUBLIC_API_BASE_URL="http://.../api/v1")
Route::prefix('v1')->group($registerRoutes);
