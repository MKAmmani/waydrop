<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TermiiService
{
    protected string $apiKey;
    protected string $senderId;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiKey = config('services.termii.api_key', '');
        $this->senderId = config('services.termii.sender_id', 'Waydrop');
        $this->baseUrl = rtrim(config('services.termii.base_url', 'https://api.ng.termii.com'), '/');
    }

    /**
     * Send transactional OTP SMS via Nigerian DND-bypass route.
     */
    public function sendOtp(string $phone, string $pin): array
    {
        // Sanitize phone to E.164 without '+'
        $cleanPhone = preg_replace('/\D/', '', $phone);

        if (str_starts_with($this->apiKey, 'mock_') || empty($this->apiKey)) {
            Log::info("[Termii Mock] Dispatched OTP {$pin} to {$cleanPhone}");
            return [
                'status' => 'success',
                'message_id' => 'mock_msg_' . uniqid(),
                'phone' => $cleanPhone,
            ];
        }

        try {
            $response = Http::timeout(10)->post("{$this->baseUrl}/api/sms/send", [
                'to' => $cleanPhone,
                'from' => $this->senderId,
                'sms' => "Your Waydrop verification code is {$pin}. Valid for 5 minutes. Do not share.",
                'type' => 'plain',
                'channel' => 'generic',
                'api_key' => $this->apiKey,
            ]);

            return $response->json();
        } catch (\Throwable $e) {
            Log::error("[Termii Error] Failed to send SMS to {$cleanPhone}: " . $e->getMessage());
            return [
                'status' => 'error',
                'message' => $e->getMessage(),
            ];
        }
    }
}
