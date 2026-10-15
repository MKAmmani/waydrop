<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Task extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'requester_id',
        'runner_id',
        'area_id',
        'item',
        'note',
        'pickup_place_id',
        'pickup_name',
        'pickup_lat',
        'pickup_lng',
        'dropoff_place_id',
        'dropoff_name',
        'dropoff_lat',
        'dropoff_lng',
        'bounty_kobo',
        'suggested_min_kobo',
        'platform_fee_kobo',
        'pin_code',
        'pin_attempts',
        'status',
        'cancellation_reason',
        'pickup_photo_url',
        'dropoff_photo_url',
        'accepted_at',
        'picked_up_at',
        'completed_at',
        'cancelled_at',
    ];

    /**
     * Handshake PIN is hidden by default from array/JSON serialization
     */
    protected $hidden = [
        'pin_code',
    ];

    protected function casts(): array
    {
        return [
            'pin_code' => 'encrypted',
            'bounty_kobo' => 'integer',
            'suggested_min_kobo' => 'integer',
            'platform_fee_kobo' => 'integer',
            'pin_attempts' => 'integer',
            'pickup_lat' => 'decimal:6',
            'pickup_lng' => 'decimal:6',
            'dropoff_lat' => 'decimal:6',
            'dropoff_lng' => 'decimal:6',
            'accepted_at' => 'datetime',
            'picked_up_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function runner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'runner_id');
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'area_id');
    }

    public function pickupPlace(): BelongsTo
    {
        return $this->belongsTo(Place::class, 'pickup_place_id');
    }

    public function dropoffPlace(): BelongsTo
    {
        return $this->belongsTo(Place::class, 'dropoff_place_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(TaskActivity::class);
    }

    public function dispute(): HasOne
    {
        return $this->hasOne(Dispute::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function callSessions(): HasMany
    {
        return $this->hasMany(CallSession::class);
    }

    /**
     * Calculate net payout to the runner in kobo.
     */
    public function getRunnerPayoutKoboAttribute(): int
    {
        return max(0, $this->bounty_kobo - $this->platform_fee_kobo);
    }
}
