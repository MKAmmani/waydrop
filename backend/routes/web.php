<?php

use App\Http\Controllers\Admin\AdminDeskController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/desk/today');

Route::prefix('desk')->name('desk.')->group(function () {
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

    // Action Handlers
    Route::post('/kyc/{id}/review', [AdminDeskController::class, 'reviewKyc'])->name('kyc.review');
    Route::post('/disputes/{id}/resolve', [AdminDeskController::class, 'resolveDispute'])->name('disputes.resolve');
    Route::post('/tasks/{id}/unlock-pin', [AdminDeskController::class, 'unlockPin'])->name('tasks.unlock_pin');
    Route::post('/payouts/{id}/retry', [AdminDeskController::class, 'retryPayout'])->name('payouts.retry');
    Route::post('/places/{id}/approve', [AdminDeskController::class, 'approvePlace'])->name('places.approve');
});
