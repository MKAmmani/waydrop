<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AblyService
{
    protected string $apiKey;

    public function __construct()
    {
        $this->apiKey = config('services.ably.api_key', '');
    }

    /**
     * Publish a real-time event to an Ably channel via REST API.
     */
    public function publish(string $channel, string $event, array $data): void
    {
        if (str_starts_with($this->apiKey, 'ably_mock_key') || empty($this->apiKey)) {
            Log::info("[Ably Mock] Published '{$event}' to channel '{$channel}'", $data);
            return;
        }

        try {
            // Ably REST uses Basic Auth with api_key
            $url = "https://rest.ably.io/channels/" . urlencode($channel) . "/messages";
            [$keyName, $keySecret] = explode(':', $this->apiKey, 2);

            Http::withBasicAuth($keyName, $keySecret)
                ->timeout(5)
                ->post($url, [
                    'name' => $event,
                    'data' => $data,
                ]);
        } catch (\Throwable $e) {
            Log::error("[Ably Publish Error] {$e->getMessage()}");
        }
    }
}
