<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskMessage extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'id',
        'task_id',
        'sender_id',
        'sender_name',
        'text',
        'is_runner',
    ];

    protected function casts(): array
    {
        return [
            'is_runner' => 'boolean',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
