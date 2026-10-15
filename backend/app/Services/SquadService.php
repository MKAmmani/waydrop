<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SquadService
{
    protected string $secretKey;
    protected string $publicKey;
    protected string $webhookSecret;
    protected string $baseUrl;

    public function __construct()
    {
        $this->secretKey = config('services.squad.secret_key', '');
        $this->publicKey = config('services.squad.public_key', '');
        $this->webhookSecret = config('services.squad.webhook_secret', '');
        $this->baseUrl = rtrim(config('services.squad.base_url', 'https://api-d.squadco.com'), '/');
    }

    /**
     * Resolve Nigerian NUBAN bank account number to retrieve registered name.
     */
    public function resolveAccount(string $accountNumber, string $bankCode): array
    {
        if (str_starts_with($this->secretKey, 'sandbox_sk_mock') || empty($this->secretKey)) {
            // Mock resolution for sandbox/testing
            return [
                'status' => 200,
                'success' => true,
                'data' => [
                    'account_name' => 'MOCK STUDENT ACCOUNT NAME',
                    'account_number' => $accountNumber,
                    'bank_code' => $bankCode,
                ],
            ];
        }

        try {
            $response = Http::withToken($this->secretKey)
                ->timeout(12)
                ->post("{$this->baseUrl}/payout/account/lookup", [
                    'account_number' => $accountNumber,
                    'bank_code' => $bankCode,
                ]);

            return $response->json();
        } catch (\Throwable $e) {
            Log::error("[Squad Account Lookup Error] {$e->getMessage()}");
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Create automated Dedicated Virtual Account (NUBAN) for instant student deposits.
     */
    public function createVirtualAccount(User $user): array
    {
        if (str_starts_with($this->secretKey, 'sandbox_sk_mock') || empty($this->secretKey)) {
            return [
                'success' => true,
                'virtual_account_number' => '80' . rand(10000000, 99999999),
                'bank_name' => 'HabariPay / GTBank',
            ];
        }

        try {
            $response = Http::withToken($this->secretKey)
                ->timeout(12)
                ->post("{$this->baseUrl}/virtual-accounts", [
                    'first_name' => $user->first_name ?? 'Waydrop',
                    'last_name' => $user->last_name ?? 'User',
                    'email' => $user->email ?? "user_{$user->id}@waydrop.ng",
                    'phone' => $user->phone ?? '+2348000000000',
                ]);

            return $response->json();
        } catch (\Throwable $e) {
            Log::error("[Squad Virtual Account Error] {$e->getMessage()}");
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Disburse funds directly into student's Nigerian bank account (NIP instant transfer).
     */
    public function initiateTransfer(string $bankCode, string $accountNumber, int $amountKobo, string $reference): array
    {
        if (str_starts_with($this->secretKey, 'sandbox_sk_mock') || empty($this->secretKey)) {
            return [
                'success' => true,
                'transaction_reference' => $reference,
                'gateway_reference' => 'SQUAD_TX_' . uniqid(),
                'status' => 'success',
            ];
        }

        try {
            $response = Http::withToken($this->secretKey)
                ->timeout(15)
                ->post("{$this->baseUrl}/payout/transfer", [
                    'amount' => $amountKobo, // Squad accepts kobo
                    'bank_code' => $bankCode,
                    'account_number' => $accountNumber,
                    'transaction_reference' => $reference,
                    'currency_id' => 'NGN',
                    'remark' => 'Waydrop Runner Payout',
                ]);

            return $response->json();
        } catch (\Throwable $e) {
            Log::error("[Squad Transfer Error] {$e->getMessage()}");
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Verify Squad webhook signature using HMAC SHA-512.
     */
    public function verifyWebhookSignature(string $rawPayload, string $signature): bool
    {
        if (empty($this->webhookSecret)) {
            return true;
        }

        $computed = hash_hmac('sha512', $rawPayload, $this->webhookSecret);
        return hash_equals($signature, $computed);
    }
}
