<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Wallet extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'balance_kobo',
        'escrow_kobo',
        'virtual_account_nuban',
        'virtual_bank_name',
    ];

    protected function casts(): array
    {
        return [
            'balance_kobo' => 'integer',
            'escrow_kobo' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    /**
     * Total wallet value (available + held escrow).
     */
    public function getTotalKoboAttribute(): int
    {
        return $this->balance_kobo + $this->escrow_kobo;
    }
}
