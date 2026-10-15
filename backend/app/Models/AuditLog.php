<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'admin_id',
        'action',
        'target_type',
        'target_id',
        'reason',
        'before_state',
        'after_state',
        'ip_address',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'before_state' => 'array',
            'after_state' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /**
     * Log an administrative action with required reason text.
     */
    public static function record(string $action, string $targetType, string $targetId, string $reason, ?array $before = null, ?array $after = null): static
    {
        return static::create([
            'admin_id' => auth()->id(),
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'reason' => $reason,
            'before_state' => $before,
            'after_state' => $after,
            'ip_address' => request()->ip(),
            'created_at' => now(),
        ]);
    }
}
