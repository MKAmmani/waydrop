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
        $this->secretKey = trim((string) config('services.squad.secret_key', ''));
        $this->publicKey = (string) config('services.squad.public_key', '');
        $this->webhookSecret = (string) config('services.squad.webhook_secret', '');
        $this->baseUrl = rtrim((string) (config('services.squad.base_url') ?: $this->defaultBaseUrl()), '/');
    }

    public function isConfigured(): bool
    {
        return $this->secretKey !== '';
    }

    /**
     * Fetch the bank list supported by Squad payouts.
     *
     * @return array{success: bool, data?: array<int, array{code: string, name: string}>, message?: string, configuration?: bool}
     */
    public function getBanks(): array
    {
        if (! $this->isConfigured()) {
            return $this->configurationError();
        }

        try {
            $bankListUrl = "{$this->baseUrl}/transaction/mandate/banklists";
            $response = $this->squadHttp()
                ->timeout(5)
                ->post($bankListUrl);

            // Squad documents POST for this endpoint, but the configured sandbox account currently
            // responds only to the legacy GET form. Keep the fallback limited to a 404 response.
            if ($response->status() === 404) {
                $response = $this->squadHttp()
                    ->timeout(5)
                    ->get($bankListUrl);
            }

            $payload = $response->json();

            if (! $response->successful() || ! is_array($payload) || ($payload['success'] ?? true) === false) {
                Log::warning('[Squad Bank List Failed]', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return [
                    'success' => false,
                    'message' => is_array($payload)
                        ? ($payload['message'] ?? 'Could not load banks from Squad.')
                        : 'Could not load banks from Squad.',
                ];
            }

            $banks = $payload['data'] ?? $payload['banks'] ?? [];
            if (! is_array($banks)) {
                return ['success' => false, 'message' => 'Squad returned an invalid bank list.'];
            }

            $normalized = [];
            foreach ($banks as $bank) {
                if (! is_array($bank)) {
                    continue;
                }

                $code = trim((string) ($bank['bank_code'] ?? $bank['code'] ?? ''));
                $name = trim((string) ($bank['bank_name'] ?? $bank['bankName'] ?? $bank['name'] ?? $bank['label'] ?? ''));
                $nipCode = trim((string) ($bank['nip_code'] ?? $bank['nipCode'] ?? ''));

                if ($code !== '' && $name !== '') {
                    $normalized[$code] = ['code' => $code, 'name' => $name, 'nip_code' => $nipCode];
                }
            }

            $normalized = array_values($normalized);
            usort($normalized, fn (array $a, array $b): int => strcasecmp($a['name'], $b['name']));

            return ['success' => true, 'data' => $normalized];
        } catch (\Throwable $e) {
            Log::error("[Squad Bank List Error] {$e->getMessage()}");

            return ['success' => false, 'message' => 'Could not reach Squad. Try again shortly.'];
        }
    }

    /**
     * Resolve Nigerian NUBAN bank account number to retrieve registered name.
     *
     * @return array{success: bool, data?: array{account_name: string, account_number: string, bank_code: string}, message?: string, configuration?: bool}
     */
    public function resolveAccount(string $accountNumber, string $bankCode): array
    {
        if (! $this->isConfigured()) {
            return $this->configurationError();
        }

        try {
            $response = $this->squadHttp()
                ->timeout(5)
                ->post("{$this->baseUrl}/payout/account/lookup", [
                    'account_number' => $accountNumber,
                    'bank_code' => $bankCode,
                ]);

            $payload = $response->json();

            if (! $response->successful() || ! is_array($payload) || ($payload['success'] ?? false) !== true) {
                Log::warning('[Squad Account Lookup Failed]', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return [
                    'success' => false,
                    'message' => is_array($payload)
                        ? ($payload['message'] ?? 'Could not resolve that account.')
                        : 'Could not resolve that account.',
                ];
            }

            $data = $payload['data'] ?? [];
            $accountName = trim((string) ($data['account_name'] ?? ''));

            if ($accountName === '') {
                return ['success' => false, 'message' => 'Squad did not return an account name.'];
            }

            return [
                'success' => true,
                'data' => [
                    'account_name' => $accountName,
                    'account_number' => (string) ($data['account_number'] ?? $accountNumber),
                    'bank_code' => (string) ($data['bank_code'] ?? $bankCode),
                ],
            ];
        } catch (\Throwable $e) {
            Log::error("[Squad Account Lookup Error] {$e->getMessage()}");

            return ['success' => false, 'message' => 'Could not reach Squad. Try again shortly.'];
        }
    }

    /**
     * @return array{success: false, message: string, configuration: true}
     */
    private function configurationError(): array
    {
        return [
            'success' => false,
            'configuration' => true,
            'message' => 'Squad is not configured. Add SQUAD_SECRET_KEY to backend/.env.',
        ];
    }

    private function defaultBaseUrl(): string
    {
        return str_starts_with($this->secretKey, 'sandbox_')
            ? 'https://sandbox-api-d.squadco.com'
            : 'https://api-d.squadco.com';
    }

    /**
     * Create automated Dedicated Virtual Account (NUBAN) for instant student deposits.
     */
    public function createVirtualAccount(User $user): array
    {
        if (str_starts_with($this->secretKey, 'sandbox_sk_mock') || empty($this->secretKey)) {
            return [
                'success' => true,
                'virtual_account_number' => '80'.rand(10000000, 99999999),
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
        if (! $this->isLive()) {
            return [
                'success' => true,
                'transaction_reference' => $reference,
                'gateway_reference' => 'SQUAD_TX_'.uniqid(),
                'status' => 'success',
            ];
        }

        try {
            $response = $this->squadHttp()
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

    private function squadHttp()
    {
        $client = Http::withToken($this->secretKey)->acceptJson()->timeout(12);

        if (! config('services.squad.verify_ssl', true)) {
            $client = $client->withOptions(['verify' => false]);
        }

        return $client;
    }

    private function isLive(): bool
    {
        return str_starts_with($this->secretKey, 'sk_') && ! str_starts_with($this->secretKey, 'sandbox_sk_');
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
