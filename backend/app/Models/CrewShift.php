<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class CrewShift extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'area_id',
        'name',
        'lead_user_id',
        'start_time',
        'end_time',
        'days_of_week',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'days_of_week' => 'array',
        ];
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lead_user_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'crew_shift_members', 'shift_id', 'user_id')
            ->withPivot('role')
            ->withTimestamps();
    }
}
