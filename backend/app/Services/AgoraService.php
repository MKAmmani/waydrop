<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class AgoraService
{
    protected string $appId;
    protected string $appCertificate;

    public function __construct()
    {
        $this->appId = config('services.agora.app_id', '');
        $this->appCertificate = config('services.agora.app_certificate', '');
    }

    /**
     * Generate an RTC token for in-app peer-to-peer VoIP audio calling.
     */
    public function generateRtcToken(string $channelName, int|string $uid, int $expireSeconds = 3600): string
    {
        if (str_starts_with($this->appId, 'agora_app_id_mock') || empty($this->appId)) {
            Log::info("[Agora Mock] Generated RTC token for channel '{$channelName}' and UID {$uid}");
            return "006mock_token_{$channelName}_{$uid}_" . (time() + $expireSeconds);
        }

        // Standard Agora RTC token building HMAC-SHA256
        $currentTimestamp = time();
        $privilegeExpiredTs = $currentTimestamp + $expireSeconds;
        $salt = rand(1, 99999999);

        $toSign = $this->appId . $this->appCertificate . $channelName . (string)$uid . $salt . $privilegeExpiredTs;
        $signature = hash_hmac('sha256', $toSign, $this->appCertificate);

        return "006{$this->appId}{$signature}" . base64_encode(json_encode([
            'c' => $channelName,
            'u' => $uid,
            'ts' => $privilegeExpiredTs,
        ]));
    }
}
