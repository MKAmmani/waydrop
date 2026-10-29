<?php

namespace App\Models;

use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements FilamentUser
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'first_name',
        'last_name',
        'email',
        'phone',
        'role',
        'runner_status',
        'photo_url',
        'area_id',
        'google_id',
        'apple_id',
        'rating',
        'trips_count',
        'is_paused',
        'is_blocked',
        'block_reason',
        'password',
        'phone_verified_at',
        'email_verified_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'password' => 'hashed',
            'rating' => 'decimal:2',
            'trips_count' => 'integer',
            'is_paused' => 'boolean',
            'is_blocked' => 'boolean',
        ];
    }

    /**
     * Determine if user can access the Filament admin desk.
     */
    public function canAccessPanel(Panel $panel): bool
    {
        // Allow super_admin, admin, and staff access to admin panel
        return in_array($this->role, ['super_admin', 'admin', 'staff']);
    }

    /**
     * Check if user is a national platform Super Administrator.
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    /**
     * Check if user is a local campus lead administrator.
     */
    public function isCampusAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Check if user has administrative or staff operational privileges.
     */
    public function isStaffOrAdmin(): bool
    {
        return in_array($this->role, ['super_admin', 'admin', 'staff']);
    }

    /**
     * Get user's financial wallet.
     */
    public function wallet(): HasOne
    {
        return $this->hasOne(Wallet::class);
    }

    /**
     * Provision the initial wallet for a user with the welcome bonus (default: 500,000 kobo / ₦5,000).
     */
    public function provisionInitialWallet(?int $initialBalanceKobo = null): Wallet
    {
        $amountKobo = $initialBalanceKobo ?? (int) (PlatformRule::get('welcome_bonus_kobo', 500000) ?? 500000);

        return DB::transaction(function () use ($amountKobo): Wallet {
            $wallet = Wallet::firstOrCreate(
                ['user_id' => $this->id],
                [
                    'balance_kobo' => $amountKobo,
                    'escrow_kobo' => 0,
                    'virtual_bank_name' => 'Squad GTCO Escrow',
                    'virtual_account_nuban' => '801'.random_int(1000000, 9999999),
                ]
            );

            if ($wallet->wasRecentlyCreated && $amountKobo > 0) {
                Transaction::create([
                    'wallet_id' => $wallet->id,
                    'type' => 'deposit',
                    'amount_kobo' => $amountKobo,
                    'balance_before_kobo' => 0,
                    'balance_after_kobo' => $wallet->balance_kobo,
                    'reference' => 'WD_WELCOME_'.strtoupper(Str::random(10)),
                    'status' => 'success',
                    'metadata' => [
                        'description' => 'Welcome bonus credit',
                        'channel' => 'system_bonus',
                    ],
                ]);
            }

            $this->setRelation('wallet', $wallet);

            return $wallet;
        });
    }

    /**
     * Get user's primary campus area.
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'area_id');
    }

    /**
     * Tasks requested by this user.
     */
    public function requestedTasks(): HasMany
    {
        return $this->hasMany(Task::class, 'requester_id');
    }

    /**
     * Tasks accepted/delivered by this user as a runner.
     */
    public function runnerTasks(): HasMany
    {
        return $this->hasMany(Task::class, 'runner_id');
    }

    /**
     * Tasks requested by this user (relationship alias).
     */
    public function tasksAsRequester(): HasMany
    {
        return $this->hasMany(Task::class, 'requester_id');
    }

    /**
     * Tasks accepted/delivered by this user as a runner (relationship alias).
     */
    public function tasksAsRunner(): HasMany
    {
        return $this->hasMany(Task::class, 'runner_id');
    }

    /**
     * Runner student verification profile.
     */
    public function runnerVerification(): HasOne
    {
        return $this->hasOne(RunnerVerification::class);
    }

    /**
     * Registered push notification devices.
     */
    public function devices(): HasMany
    {
        return $this->hasMany(Device::class);
    }

    /**
     * Bank payouts requested by runner.
     */
    public function payouts(): HasMany
    {
        return $this->hasMany(Payout::class);
    }

    /**
     * In-app notifications for this user.
     */
    public function userNotifications(): HasMany
    {
        return $this->hasMany(UserNotification::class);
    }

    /**
     * Helper to return formatted full name.
     */
    public function getFullNameAttribute(): string
    {
        if ($this->first_name || $this->last_name) {
            return trim("{$this->first_name} {$this->last_name}");
        }

        return $this->name ?? 'Waydrop User';
    }
}
