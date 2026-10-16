<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Support\Facades\View::composer('desk.*', function ($view) {
            try {
                $user = auth()->user();
                $campusId = null;
                if ($user) {
                    $campusId = $user->isSuperAdmin() ? session('active_campus_id') : $user->area_id;
                }

                $openErrandsQuery = \App\Models\Task::whereIn('status', ['pending', 'accepted', 'picked_up']);
                $disputesQuery = \App\Models\Dispute::where('status', 'open');
                $kycQuery = \App\Models\RunnerVerification::whereIn('status', ['pending', 'ai_verified', 'flagged']);
                $lockedQuery = \App\Models\Task::where(function ($q) {
                    $q->where('status', 'disputed')->orWhere('pin_attempts', '>=', 3);
                });
                $payoutsQuery = \App\Models\Payout::where('status', 'failed');
                $placesQuery = \App\Models\Place::where('confirmed', false);

                if ($campusId && $campusId !== 'all') {
                    $openErrandsQuery->where('area_id', $campusId);
                    $disputesQuery->whereHas('task', fn($q) => $q->where('area_id', $campusId));
                    $lockedQuery->where('area_id', $campusId);
                    $placesQuery->where('area_id', $campusId);
                    $kycQuery->where('campus_id', $campusId);
                }

                $view->with('deskBadges', [
                    'openErrands' => $openErrandsQuery->count(),
                    'disputes' => $disputesQuery->count(),
                    'kyc' => $kycQuery->count(),
                    'locked' => $lockedQuery->count(),
                    'failedPayouts' => $payoutsQuery->count(),
                    'pendingPlaces' => $placesQuery->count(),
                ]);
            } catch (\Throwable $e) {
                $view->with('deskBadges', [
                    'openErrands' => 0,
                    'disputes' => 0,
                    'kyc' => 0,
                    'locked' => 0,
                    'failedPayouts' => 0,
                    'pendingPlaces' => 0,
                ]);
            }
        });
    }
}
