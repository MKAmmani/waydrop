<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payout extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'amount_kobo',
        'bank_name',
        'bank_code',
        'account_number',
        'account_name',
        'status',
        'gateway_provider',
        'gateway_reference',
        'failure_reason',
        'retry_count',
        'last_attempt_at',
        'reviewed_by',
    ];

    protected function casts(): array
    {
        return [
            'amount_kobo' => 'integer',
            'retry_count' => 'integer',
            'last_attempt_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
