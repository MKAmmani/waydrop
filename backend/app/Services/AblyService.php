<?php

namespace App\Services;

use Ably\AblyRest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AblyService
{
    protected ?AblyRest $client = null;

    protected ?string $key;

    public function __construct()
    {
        $this->key = config('services.ably.key');
        if (! empty($this->key)) {
            try {
                if (! class_exists('Ably\AblyRest')) {
                    $loader = base_path('vendor/ably/ably-php/ably-loader.php');
                    if (file_exists($loader)) {
                        require_once $loader;
                    }
                }
                $this->client = new AblyRest(['key' => $this->key]);
            } catch (\Throwable $e) {
                Log::error('[AblyService] Init error: '.$e->getMessage());
            }
        }
    }

    /**
     * Check if Ably is configured
     */
    public function isConfigured(): bool
    {
        return ! empty($this->key);
    }

    /**
     * Generate an Ably token request for mobile client authCallback
     */
    public function createTokenRequest(?string $clientId = null, array $capability = ['*' => ['*']]): ?array
    {
        if (! $this->isConfigured()) {
            return null;
        }

        try {
            $params = [
                'capability' => json_encode($capability),
            ];
            if ($clientId) {
                $params['clientId'] = $clientId;
            }

            if (! $this->client) {
                if (! class_exists('Ably\AblyRest')) {
                    $loader = base_path('vendor/ably/ably-php/ably-loader.php');
                    if (file_exists($loader)) {
                        require_once $loader;
                    }
                }
                $this->client = new AblyRest(['key' => $this->key]);
            }

            $tokenRequest = $this->client->auth->createTokenRequest($params);

            return (array) $tokenRequest;
        } catch (\Throwable $e) {
            Log::error('[AblyService] Token request failed: '.$e->getMessage());

            return null;
        }
    }

    /**
     * Publish event to a specific channel
     */
    public function publish(string $channelName, string $eventName, array $data): bool
    {
        if (! $this->isConfigured()) {
            return false;
        }

        try {
            [$keyId, $keySecret] = explode(':', $this->key, 2);
            $encodedChannel = urlencode($channelName);
            $isDev = app()->isLocal() || config('app.debug');

            $response = Http::connectTimeout((float) config('services.ably.connect_timeout', 2))
                ->timeout((float) config('services.ably.publish_timeout', 4))
                ->withOptions([
                    'force_ip_resolve' => 'v4',
                    'verify' => ! $isDev,
                ])
                ->withBasicAuth($keyId, $keySecret)
                ->post("https://rest.ably.io/channels/{$encodedChannel}/messages", [
                    'name' => $eventName,
                    'data' => $data,
                ]);

            if ($response->successful()) {
                return true;
            }

            Log::error("[AblyService] Publish returned {$response->status()} on {$channelName}: ".$response->body());

            return false;
        } catch (\Throwable $e) {
            Log::error("[AblyService] Publish error on {$channelName}: ".$e->getMessage());

            return false;
        }
    }

    /**
     * Publish radar updates to a campus channel
     */
    public function publishCampusRadar(string $campusId, array $data): bool
    {
        return $this->publish("campus:{$campusId}:radar", 'radar.update', $data);
    }
}
