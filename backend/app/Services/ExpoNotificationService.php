<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoNotificationService
{
    protected string $accessToken;

    public function __construct()
    {
        $this->accessToken = config('services.expo.access_token', '');
    }

    /**
     * Send push notification to Expo mobile tokens.
     */
    public function sendPushNotification(array|string $tokens, string $title, string $body, array $data = []): array
    {
        $tokens = is_array($tokens) ? $tokens : [$tokens];

        if (empty($tokens)) {
            return ['status' => 'empty_tokens'];
        }

        if (str_starts_with($this->accessToken, 'expo_token_mock') || empty($this->accessToken)) {
            Log::info("[Expo Push Mock] Dispatched push to " . count($tokens) . " devices: '{$title}' - '{$body}'", $data);
            return ['status' => 'mock_delivered', 'count' => count($tokens)];
        }

        $messages = [];
        foreach ($tokens as $token) {
            $messages[] = [
                'to' => $token,
                'sound' => 'default',
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'priority' => 'high',
            ];
        }

        try {
            $request = Http::timeout(10);
            if (!empty($this->accessToken)) {
                $request = $request->withToken($this->accessToken);
            }

            $response = $request->post('https://exp.host/--/api/v2/push/send', $messages);

            return $response->json();
        } catch (\Throwable $e) {
            Log::error("[Expo Push Error] {$e->getMessage()}");
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }
}
