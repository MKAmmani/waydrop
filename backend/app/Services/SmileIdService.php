<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmileIdService
{
    protected string $partnerId;
    protected string $apiKey;
    protected string $serverUrl;

    public function __construct()
    {
        $this->partnerId = config('services.smile_id.partner_id', '');
        $this->apiKey = config('services.smile_id.api_key', '');
        $this->serverUrl = rtrim(config('services.smile_id.sid_server', 'https://testapi.smileidentity.com/v1'), '/');
    }

    /**
     * Submit biometric 1:1 face match & liveness job.
     */
    public function verifyBiometrics(string $userId, string $idPhotoUrl, string $selfieUrl): array
    {
        if (str_starts_with($this->apiKey, 'smile_api_key_mock') || empty($this->apiKey)) {
            // Mock AI verification with high confidence
            return [
                'success' => true,
                'job_id' => 'JOB_SM_' . rand(100000, 999999),
                'confidence' => 97.40,
                'liveness_passed' => true,
                'raw' => [
                    'ResultCode' => '1012',
                    'ResultText' => 'Exact Match and Liveness Passed',
                    'SmileJobID' => 'SM_MOCK_' . uniqid(),
                ],
            ];
        }

        try {
            $timestamp = now()->toIso8601String();
            $signature = base64_encode(hash_hmac('sha256', $timestamp . $this->partnerId . 'job_status', $this->apiKey, true));

            $response = Http::timeout(20)->post("{$this->serverUrl}/biometric_kyc", [
                'partner_id' => $this->partnerId,
                'timestamp' => $timestamp,
                'signature' => $signature,
                'user_id' => $userId,
                'job_type' => 1, // Biometric KYC
                'id_photo' => $idPhotoUrl,
                'selfie_photo' => $selfieUrl,
            ]);

            $json = $response->json();
            $confidence = (float) ($json['ConfidenceValue'] ?? 0.0);
            $liveness = ($json['LivenessPassed'] ?? false) === true;

            return [
                'success' => $response->successful(),
                'job_id' => $json['SmileJobID'] ?? null,
                'confidence' => $confidence,
                'liveness_passed' => $liveness,
                'raw' => $json,
            ];
        } catch (\Throwable $e) {
            Log::error("[Smile ID Error] {$e->getMessage()}");
            return [
                'success' => false,
                'confidence' => 0.0,
                'liveness_passed' => false,
                'message' => $e->getMessage(),
            ];
        }
    }
}
