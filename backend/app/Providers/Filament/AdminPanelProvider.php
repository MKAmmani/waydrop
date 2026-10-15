<?php

namespace App\Providers\Filament;

use App\Models\Dispute;
use App\Models\Payout;
use App\Models\RunnerVerification;
use App\Models\Task;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Navigation\NavigationGroup;
use Filament\Navigation\NavigationItem;
use App\Filament\Pages\Dashboard;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Filament\Widgets\AccountWidget;
use Filament\Widgets\FilamentInfoWidget;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login()
            ->brandName('Waydrop Desk')
            ->homeUrl('/desk/today')
            ->colors([
                'primary' => Color::hex('#F05A28'), // Tangerine brand color
                'gray' => Color::Slate,
            ])
            ->navigationItems([
                NavigationItem::make('Today & Pulse')
                    ->url('/desk/today')
                    ->icon('heroicon-o-chart-bar')
                    ->group('Operations')
                    ->sort(1),

                NavigationItem::make('Needs You Queue')
                    ->url('/desk/queue')
                    ->icon('heroicon-o-bell-alert')
                    ->badge(fn () => (string) (
                        Dispute::where('status', 'open')->count() +
                        Task::where('status', 'disputed')->count() +
                        Payout::where('status', 'failed')->count()
                    ), 'danger')
                    ->group('Operations')
                    ->sort(2),

                NavigationItem::make('Disputes Desk')
                    ->url('/desk/disputes')
                    ->icon('heroicon-o-scale')
                    ->badge(fn () => (string) Dispute::where('status', 'open')->count(), 'warning')
                    ->group('Resolution')
                    ->sort(3),

                NavigationItem::make('ID Checks / KYC')
                    ->url('/desk/kyc')
                    ->icon('heroicon-o-identification')
                    ->badge(fn () => (string) RunnerVerification::whereIn('status', ['pending', 'ai_verified'])->count(), 'primary')
                    ->group('Resolution')
                    ->sort(4),

                NavigationItem::make('Locked Handovers')
                    ->url('/desk/locked-handovers')
                    ->icon('heroicon-o-lock-closed')
                    ->badge(fn () => (string) Task::where('status', 'disputed')->orWhere('pin_attempts', '>=', 3)->count(), 'danger')
                    ->group('Resolution')
                    ->sort(5),

                NavigationItem::make('Failed Payouts')
                    ->url('/desk/payouts')
                    ->icon('heroicon-o-banknotes')
                    ->badge(fn () => (string) Payout::where('status', 'failed')->count(), 'danger')
                    ->group('Financial')
                    ->sort(6),

                NavigationItem::make('People & Safety')
                    ->url('/desk/people')
                    ->icon('heroicon-o-users')
                    ->group('Campus')
                    ->sort(7),

                NavigationItem::make('Places & Landmarks')
                    ->url('/desk/places')
                    ->icon('heroicon-o-map-pin')
                    ->group('Campus')
                    ->sort(8),

                NavigationItem::make('Crew & Routines')
                    ->url('/desk/crew')
                    ->icon('heroicon-o-user-group')
                    ->group('Campus')
                    ->sort(9),

                NavigationItem::make('Rules Engine')
                    ->url('/desk/rules')
                    ->icon('heroicon-o-adjustments-horizontal')
                    ->group('System')
                    ->sort(10),

                NavigationItem::make('Audit Trail')
                    ->url('/desk/audit')
                    ->icon('heroicon-o-clipboard-document-list')
                    ->group('System')
                    ->sort(11),

                NavigationItem::make('👑 Campuses & Admins')
                    ->url('/desk/campuses')
                    ->icon('heroicon-o-building-library')
                    ->group('System')
                    ->sort(12),
            ])
            ->navigationGroups([
                NavigationGroup::make('Operations'),
                NavigationGroup::make('Resolution'),
                NavigationGroup::make('Financial'),
                NavigationGroup::make('Campus'),
                NavigationGroup::make('System'),
            ])
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\Filament\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\Filament\Pages')
            ->pages([
                Dashboard::class,
            ])
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\Filament\Widgets')
            ->widgets([
                AccountWidget::class,
                FilamentInfoWidget::class,
            ])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                PreventRequestForgery::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);
    }
}
