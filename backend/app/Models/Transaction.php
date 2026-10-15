<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'wallet_id',
        'task_id',
        'type',
        'amount_kobo',
        'balance_before_kobo',
        'balance_after_kobo',
        'reference',
        'gateway_reference',
        'status',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount_kobo' => 'integer',
            'balance_before_kobo' => 'integer',
            'balance_after_kobo' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }
}
