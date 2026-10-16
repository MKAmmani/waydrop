<?php

use App\Http\Controllers\Admin\AdminDeskController;
use App\Http\Controllers\Admin\AuthController;
use Illuminate\Support\Facades\Route;

// Top-level redirects
Route::redirect('/', '/desk/today');
Route::redirect('/admin', '/desk/today');
Route::redirect('/admin/login', '/login');

// Authentication Routes (Waydrop Desk Custom Theme)
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login'])->name('login.post');
Route::match(['get', 'post'], '/logout', [AuthController::class, 'logout'])->name('logout');

// Operational Desks (Protected by Auth Middleware)
Route::prefix('desk')->name('desk.')->middleware('auth')->group(function () {
    Route::get('/today', [AdminDeskController::class, 'today'])->name('today');
    Route::get('/queue', [AdminDeskController::class, 'queue'])->name('queue');
    Route::get('/disputes', [AdminDeskController::class, 'disputes'])->name('disputes');
    Route::get('/kyc', [AdminDeskController::class, 'kyc'])->name('kyc');
    Route::get('/locked-handovers', [AdminDeskController::class, 'lockedHandovers'])->name('locked_handovers');
    Route::get('/people', [AdminDeskController::class, 'people'])->name('people');
    Route::get('/payouts', [AdminDeskController::class, 'payouts'])->name('payouts');
    Route::get('/places', [AdminDeskController::class, 'places'])->name('places');
    Route::get('/crew', [AdminDeskController::class, 'crew'])->name('crew');
    Route::get('/rules', [AdminDeskController::class, 'rules'])->name('rules');
    Route::get('/audit', [AdminDeskController::class, 'audit'])->name('audit');
    Route::get('/campuses', [AdminDeskController::class, 'campuses'])->name('campuses');

    // Desk Action Endpoints
    Route::post('/kyc/{id}/review', [AdminDeskController::class, 'reviewKyc'])->name('kyc.review');
    Route::post('/disputes/{id}/resolve', [AdminDeskController::class, 'resolveDispute'])->name('disputes.resolve');
    Route::post('/tasks/{id}/unlock-pin', [AdminDeskController::class, 'unlockPin'])->name('tasks.unlock_pin');
    Route::post('/payouts/{id}/retry', [AdminDeskController::class, 'retryPayout'])->name('payouts.retry');
    Route::post('/places/{id}/approve', [AdminDeskController::class, 'approvePlace'])->name('places.approve');
    Route::post('/places', [AdminDeskController::class, 'createPlace'])->name('places.store');
    Route::post('/places/{id}/update', [AdminDeskController::class, 'updatePlace'])->name('places.update');
    Route::post('/places/{id}/delete', [AdminDeskController::class, 'deletePlace'])->name('places.destroy');
    Route::post('/rules', [AdminDeskController::class, 'updateRules'])->name('rules.update');
    Route::post('/rules/new', [AdminDeskController::class, 'createRule'])->name('rules.store');
    Route::post('/users/{id}/status', [AdminDeskController::class, 'updateUserStatus'])->name('users.status');
    Route::post('/telemetry/broadcast', [AdminDeskController::class, 'broadcastRunnerTelemetry'])->name('telemetry.broadcast');

    // Super Admin Exclusive Actions
    Route::post('/campuses', [AdminDeskController::class, 'createCampus'])->name('campuses.store');
    Route::post('/campuses/{id}/update', [AdminDeskController::class, 'updateCampus'])->name('campuses.update');
    Route::post('/campuses/{id}/toggle-status', [AdminDeskController::class, 'toggleCampusStatus'])->name('campuses.toggle');
    Route::post('/campuses/{id}/delete', [AdminDeskController::class, 'deleteCampus'])->name('campuses.destroy');
    Route::post('/admins', [AdminDeskController::class, 'createCampusAdmin'])->name('admins.store');
    Route::post('/admins/{id}/update', [AdminDeskController::class, 'updateCampusAdmin'])->name('admins.update');
    Route::post('/admins/{id}/toggle-status', [AdminDeskController::class, 'toggleCampusAdminStatus'])->name('admins.toggle');
    Route::post('/admins/{id}/delete', [AdminDeskController::class, 'deleteCampusAdmin'])->name('admins.destroy');
    Route::post('/campus/switch', [AdminDeskController::class, 'switchCampus'])->name('campus.switch');
});
