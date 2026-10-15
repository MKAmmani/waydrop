<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OtpRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'phone',
        'ip_address',
        'code_hash',
        'attempts',
        'is_used',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'is_used' => 'boolean',
            'expires_at' => 'datetime',
        ];
    }
}
