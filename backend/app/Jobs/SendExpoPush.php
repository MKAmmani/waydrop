<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\ExpoNotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendExpoPush implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $userId,
        public string $title,
        public string $body,
        public array $data = [],
    ) {}

    /**
     * Dispatch the push to all registered devices for the user.
     */
    public function handle(ExpoNotificationService $expo): void
    {
        $tokens = User::find($this->userId)?->devices()->pluck('push_token')->all() ?? [];

        if ($tokens === []) {
            return;
        }

        $channelId = ($this->data['type'] ?? null) === 'call_initiated' ? 'calls' : 'default';

        $expo->sendPushNotification($tokens, $this->title, $this->body, $this->data, $channelId);
    }
}
