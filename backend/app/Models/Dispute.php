<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Dispute extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'task_id',
        'requester_id',
        'runner_id',
        'opened_by',
        'reason',
        'explanation',
        'evidence_urls',
        'held_amount_kobo',
        'status',
        'resolution_type',
        'refund_kobo',
        'payout_kobo',
        'resolved_by',
        'resolved_at',
        'admin_notes',
        'sla_expires_at',
    ];

    protected function casts(): array
    {
        return [
            'evidence_urls' => 'array',
            'held_amount_kobo' => 'integer',
            'refund_kobo' => 'integer',
            'payout_kobo' => 'integer',
            'resolved_at' => 'datetime',
            'sla_expires_at' => 'datetime',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function runner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'runner_id');
    }

    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
