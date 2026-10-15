<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RunnerVerification extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'campus_id',
        'faculty',
        'department',
        'matric_number',
        'document_type',
        'document_url',
        'selfie_url',
        'payout_bank_code',
        'payout_account_number',
        'payout_account_name',
        'name_match_score',
        'biometric_provider',
        'biometric_job_id',
        'biometric_confidence',
        'biometric_liveness_passed',
        'biometric_raw_response',
        'status',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'name_match_score' => 'decimal:2',
            'biometric_confidence' => 'decimal:2',
            'biometric_liveness_passed' => 'boolean',
            'biometric_raw_response' => 'array',
            'reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function campus(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'campus_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
