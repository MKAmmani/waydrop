<?php

namespace App\Providers;

use App\Models\Dispute;
use App\Models\Payout;
use App\Models\Place;
use App\Models\RunnerVerification;
use App\Models\Task;
use Illuminate\Support\Facades\View;
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
        View::composer('desk.*', function ($view) {
            try {
                $user = auth()->user();
                $campusId = null;
                if ($user) {
                    $campusId = $user->isSuperAdmin() ? session('active_campus_id') : $user->area_id;
                }

                $openErrandsQuery = Task::whereIn('status', ['pending', 'accepted', 'picked_up']);
                $disputesQuery = Dispute::where('status', 'open');
                $kycQuery = RunnerVerification::whereIn('status', ['pending', 'ai_verified', 'flagged']);
                $lockedQuery = Task::where(function ($q) {
                    $q->where('status', 'disputed')->orWhere('pin_attempts', '>=', 3);
                });
                $payoutsQuery = Payout::where('status', 'failed');
                if (! ($user?->isSuperAdmin() ?? false)) {
                    $payoutsQuery->whereHas('user', fn ($q) => $q->where('role', '!=', 'platform'));
                }
                $placesQuery = Place::where('confirmed', false);

                if ($campusId && $campusId !== 'all') {
                    $openErrandsQuery->where('area_id', $campusId);
                    $disputesQuery->whereHas('task', fn ($q) => $q->where('area_id', $campusId));
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
