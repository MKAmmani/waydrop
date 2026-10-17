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
        $this->senderId = config('services.termii.sender_id') ?: 'N-Alert';
        $this->baseUrl = rtrim(config('services.termii.base_url') ?: 'https://api.ng.termii.com', '/');
    }

    /**
     * Send transactional OTP SMS via Nigerian DND-bypass route.
     */
    public function sendOtp(string $phone, string $pin): array
    {
        // Sanitize phone to E.164 with country code (e.g. 2348012345678)
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
                'sms' => "Your Waydrop code is {$pin}. Valid for 5 minutes. Do not share.",
                'type' => 'plain',
                'channel' => 'dnd', // DND bypass channel for guaranteed Nigerian delivery
                'api_key' => $this->apiKey,
            ]);

            $json = $response->json();
            Log::info("[Termii Live Response] " . json_encode($json));

            return $json ?? ['status' => 'sent'];
        } catch (\Throwable $e) {
            Log::error("[Termii Error] Failed to send SMS to {$cleanPhone}: " . $e->getMessage());
            return [
                'status' => 'error',
                'message' => $e->getMessage(),
            ];
        }
    }
}
