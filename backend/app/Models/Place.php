<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Place extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'area_id',
        'name',
        'aka',
        'kind',
        'lat',
        'lng',
        'confirmed',
        'note',
        'used_count',
        'suggested_by_user_id',
        'bounty_paid',
    ];

    protected function casts(): array
    {
        return [
            'aka' => 'array',
            'confirmed' => 'boolean',
            'bounty_paid' => 'boolean',
            'used_count' => 'integer',
            'lat' => 'decimal:6',
            'lng' => 'decimal:6',
        ];
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function suggestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'suggested_by_user_id');
    }

    public function pickupTasks(): HasMany
    {
        return $this->hasMany(Task::class, 'pickup_place_id');
    }

    public function dropoffTasks(): HasMany
    {
        return $this->hasMany(Task::class, 'dropoff_place_id');
    }
}
