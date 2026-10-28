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
        'type',
        'requester_id',
        'runner_id',
        'area_id',
        'item',
        'note',
        'items',
        'source',
        'rules',
        'pickup_place_id',
        'pickup_name',
        'pickup_lat',
        'pickup_lng',
        'dropoff_place_id',
        'dropoff_name',
        'dropoff_lat',
        'dropoff_lng',
        'bounty_kobo',
        'budget_kobo',
        'spent_kobo',
        'refund_kobo',
        'suggested_min_kobo',
        'platform_fee_kobo',
        'pin_code',
        'pin_attempts',
        'status',
        'cancellation_reason',
        'pickup_photo_url',
        'dropoff_photo_url',
        'seat_photo_url',
        'live_share',
        'beacon_active',
        'vendor_payment',
        'cash_purchase',
        'active_ask',
        'accepted_at',
        'picked_up_at',
        'arrived_at',
        'completed_at',
        'cancelled_at',
        'rating',
        'rating_tags',
        'rating_note',
        'tip_kobo',
        'is_late',
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
            'budget_kobo' => 'integer',
            'spent_kobo' => 'integer',
            'refund_kobo' => 'integer',
            'items' => 'array',
            'source' => 'array',
            'rules' => 'array',
            'live_share' => 'boolean',
            'beacon_active' => 'boolean',
            'vendor_payment' => 'array',
            'cash_purchase' => 'array',
            'active_ask' => 'array',
            'suggested_min_kobo' => 'integer',
            'platform_fee_kobo' => 'integer',
            'tip_kobo' => 'integer',
            'pin_attempts' => 'integer',
            'rating' => 'integer',
            'rating_tags' => 'array',
            'is_late' => 'boolean',
            'pickup_lat' => 'decimal:6',
            'pickup_lng' => 'decimal:6',
            'dropoff_lat' => 'decimal:6',
            'dropoff_lng' => 'decimal:6',
            'accepted_at' => 'datetime',
            'picked_up_at' => 'datetime',
            'arrived_at' => 'datetime',
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

    public function messages(): HasMany
    {
        return $this->hasMany(TaskMessage::class);
    }

    /**
     * Calculate net payout to the runner in kobo.
     */
    public function getRunnerPayoutKoboAttribute(): int
    {
        $bounty = (int) ($this->bounty_kobo ?? 0);
        $platformFee = (int) ($this->platform_fee_kobo ?: round($bounty * 0.10));

        return max(0, $bounty - $platformFee);
    }
}
