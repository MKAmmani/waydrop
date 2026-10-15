<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'group',
        'title',
        'description',
        'is_active',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Helper to retrieve rule value with fallback.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $rule = static::where('key', $key)->where('is_active', true)->first();

        return $rule ? $rule->value : $default;
    }
}
