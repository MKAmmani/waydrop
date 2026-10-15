<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Area extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'subtitle',
        'lat',
        'lng',
        'radius_meters',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'lat' => 'decimal:6',
            'lng' => 'decimal:6',
            'radius_meters' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function places(): HasMany
    {
        return $this->hasMany(Place::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function crewShifts(): HasMany
    {
        return $this->hasMany(CrewShift::class);
    }
}
